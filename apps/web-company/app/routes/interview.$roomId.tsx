import { useEffect, useRef, useState, useCallback } from 'react';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Interview Room – CareerNest' }];

const STUN_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

const SIGNAL_POLL_INTERVAL = 1500;

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    const roomId = params.roomId!;

    let roomInfo: any = null;
    try {
        const res = await api.interviews.getRoomDetails(token, roomId) as any;
        roomInfo = res.data || res;
    } catch (err: any) {
        roomInfo = { roomId, error: err?.message || 'Room not found' };
    }

    return json({ token, user, roomId, roomInfo });
}

export default function InterviewRoomPage() {
    const { token, user, roomId, roomInfo } = useLoaderData<typeof loader>();

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; text: string; time: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [hasLeft, setHasLeft] = useState(false);
    const [participants, setParticipants] = useState<{ id: string; name: string; stream: MediaStream | null; isMuted: boolean; isCameraOff: boolean }[]>([]);
    const [unreadChat, setUnreadChat] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected'>('connecting');

    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const lastSignalTime = useRef('');
    const pollRef = useRef<NodeJS.Timeout | null>(null);
    const screenStream = useRef<MediaStream | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const createPeerConnection = useCallback((peerId: string) => {
        const pc = new RTCPeerConnection(STUN_SERVERS);
        pc.onicecandidate = e => {
            if (e.candidate) {
                api.interviewSignal.send(token, roomId, { type: 'candidate', targetId: peerId, data: JSON.stringify(e.candidate) }).catch(() => {});
            }
        };
        pc.ontrack = e => {
            const stream = e.streams[0];
            setParticipants(prev => {
                const idx = prev.findIndex(p => p.id === peerId);
                if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], stream }; return n; }
                return [...prev, { id: peerId, name: 'Participant', stream, isMuted: false, isCameraOff: false }];
            });
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                setParticipants(prev => prev.filter(p => p.id !== peerId));
                peerConnections.current.delete(peerId);
            }
        };
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
        }
        peerConnections.current.set(peerId, pc);
        return pc;
    }, [token, roomId]);

    const processSignals = useCallback(async () => {
        try {
            const res = await api.interviewSignal.poll(token, roomId, lastSignalTime.current || undefined) as any;
            const signals = res.data?.signals || res.signals || [];
            for (const signal of signals) {
                if (signal.senderId === (user as any).$id) { lastSignalTime.current = signal.$createdAt; continue; }
                lastSignalTime.current = signal.$createdAt;
                const data = typeof signal.data === 'string' ? JSON.parse(signal.data) : signal.data;

                if (signal.type === 'join') {
                    setParticipants(prev => prev.some(p => p.id === signal.senderId) ? prev
                        : [...prev, { id: signal.senderId, name: signal.senderName || 'Participant', stream: null, isMuted: false, isCameraOff: false }]);
                    const pc = createPeerConnection(signal.senderId);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    api.interviewSignal.send(token, roomId, { type: 'offer', targetId: signal.senderId, data: JSON.stringify(offer) }).catch(() => {});
                } else if (signal.type === 'offer' && (!signal.targetId || signal.targetId === (user as any).$id)) {
                    const pc = createPeerConnection(signal.senderId);
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    api.interviewSignal.send(token, roomId, { type: 'answer', targetId: signal.senderId, data: JSON.stringify(answer) }).catch(() => {});
                } else if (signal.type === 'answer' && (!signal.targetId || signal.targetId === (user as any).$id)) {
                    const pc = peerConnections.current.get(signal.senderId);
                    if (pc?.signalingState !== 'stable') await pc?.setRemoteDescription(new RTCSessionDescription(data));
                } else if (signal.type === 'candidate' && (!signal.targetId || signal.targetId === (user as any).$id)) {
                    const pc = peerConnections.current.get(signal.senderId);
                    if (pc?.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(data));
                } else if (signal.type === 'chat') {
                    setChatMessages(prev => [...prev, { id: signal.$id, sender: signal.senderName || 'Participant', text: data.text, time: new Date(signal.$createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }]);
                    if (!showChat) setUnreadChat(n => n + 1);
                } else if (signal.type === 'leave') {
                    setParticipants(prev => prev.filter(p => p.id !== signal.senderId));
                    const pc = peerConnections.current.get(signal.senderId);
                    if (pc) { pc.close(); peerConnections.current.delete(signal.senderId); }
                }
            }
        } catch { /* ignore */ }
    }, [token, roomId, user, createPeerConnection, showChat]);

    useEffect(() => {
        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStreamRef.current = stream;
                setLocalStream(stream);
                setConnectionStatus('connected');
            } catch {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    localStreamRef.current = stream;
                    setLocalStream(stream);
                    setIsCameraOff(true);
                    setConnectionStatus('connected');
                } catch { /* ignore */ }
            }
            api.interviewSignal.send(token, roomId, { type: 'join', data: JSON.stringify({ userId: (user as any).$id, name: (user as any).name }) }).catch(() => {});
            pollRef.current = setInterval(processSignals, SIGNAL_POLL_INTERVAL);
        };
        init();
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            api.interviewSignal.send(token, roomId, { type: 'leave', data: JSON.stringify({ userId: (user as any).$id }) }).catch(() => {});
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            screenStream.current?.getTracks().forEach(t => t.stop());
            peerConnections.current.forEach(pc => pc.close());
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const LocalVideoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (LocalVideoRef.current && localStream) {
            LocalVideoRef.current.srcObject = isScreenSharing ? screenStream.current : localStream;
        }
    }, [localStream, isScreenSharing]);

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

    const toggleMute = () => {
        localStream?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        api.interviewSignal.send(token, roomId, { type: 'mute_status', data: JSON.stringify({ isMuted: newMuted, isCameraOff }) }).catch(() => {});
    };
    const toggleCamera = () => {
        localStream?.getVideoTracks().forEach(t => { t.enabled = isCameraOff; });
        const newOff = !isCameraOff;
        setIsCameraOff(newOff);
        api.interviewSignal.send(token, roomId, { type: 'mute_status', data: JSON.stringify({ isMuted, isCameraOff: newOff }) }).catch(() => {});
    };
    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            screenStream.current?.getTracks().forEach(t => t.stop()); screenStream.current = null; setIsScreenSharing(false);
            const vt = localStream?.getVideoTracks()[0];
            if (vt) peerConnections.current.forEach(pc => { const sender = pc.getSenders().find(s => s.track?.kind === 'video'); if (sender) sender.replaceTrack(vt); });
        } else {
            try {
                const screen = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
                screenStream.current = screen; setIsScreenSharing(true);
                const vt = screen.getVideoTracks()[0];
                if (vt) { peerConnections.current.forEach(pc => { const sender = pc.getSenders().find(s => s.track?.kind === 'video'); if (sender) sender.replaceTrack(vt); }); vt.onended = () => { setIsScreenSharing(false); screenStream.current = null; }; }
            } catch { /* user denied */ }
        }
    };
    const sendChat = async () => {
        if (!chatInput.trim()) return;
        const text = chatInput.trim(); setChatInput('');
        setChatMessages(prev => [...prev, { id: Date.now().toString(), sender: (user as any).name + ' (You)', text, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }]);
        api.interviewSignal.send(token, roomId, { type: 'chat', data: JSON.stringify({ text }) }).catch(() => {});
    };
    const leaveRoom = async () => {
        if (pollRef.current) clearInterval(pollRef.current);
        await api.interviewSignal.send(token, roomId, { type: 'leave', data: JSON.stringify({}) }).catch(() => {});
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        peerConnections.current.forEach(pc => pc.close());
        setHasLeft(true);
    };

    if (roomInfo?.error) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="text-center p-8"><p className="text-red-400 text-xl mb-4">Room Not Found</p><p className="text-gray-400 text-sm mb-6">{roomInfo.error}</p><button onClick={() => window.history.back()} className="px-6 py-2 bg-blue-600 text-white rounded-xl">Go Back</button></div>
        </div>
    );

    if (hasLeft) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="text-center p-8"><p className="text-white text-xl mb-4">You've left the interview</p><button onClick={() => window.history.back()} className="px-6 py-2 bg-blue-600 text-white rounded-xl">Go Back</button></div>
        </div>
    );

    const gridCols = 1 + participants.length <= 1 ? 'grid-cols-1' : 1 + participants.length <= 2 ? 'grid-cols-2' : 'grid-cols-2';

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-white/5">
                <span className="text-white font-semibold text-sm">CareerNest Interview · {(user as any).companyName || (user as any).name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400 animate-pulse'}`}>
                    {connectionStatus === 'connected' ? `${1 + participants.length} participant(s)` : 'Connecting...'}
                </span>
            </div>
            {/* Main */}
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 p-4 relative">
                    <div className={`grid ${gridCols} gap-3 h-full`}>
                        {/* Local */}
                        <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                            {localStream && !isCameraOff ? (
                                <video ref={LocalVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">{getInitials((user as any).name)}</div>
                                    <p className="text-white/50 text-xs">{isCameraOff ? 'Camera off' : 'No camera'}</p>
                                </div>
                            )}
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-xs rounded-lg">{(user as any).name} (You){isMuted && ' [muted]'}</span>
                        </div>
                        {/* Remote */}
                        {participants.map(p => (
                            <div key={p.id} className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                                {p.stream ? (
                                    <video ref={el => { if (el) { el.srcObject = p.stream; } }} autoPlay playsInline className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-2xl font-bold">{getInitials(p.name)}</div>
                                )}
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-xs rounded-lg">{p.name}{p.isMuted && ' [muted]'}</span>
                            </div>
                        ))}
                    </div>
                    {participants.length === 0 && connectionStatus === 'connected' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="text-white/30 text-sm">Waiting for the candidate to join...</p>
                        </div>
                    )}
                </div>
                {showChat && (
                    <div className="w-64 border-l border-white/10 bg-gray-900 flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <span className="text-white text-sm font-medium">Chat</span>
                            <button onClick={() => setShowChat(false)} className="text-white/40 hover:text-white text-lg leading-none">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {chatMessages.map(m => (
                                <div key={m.id}>
                                    <p className="text-white/60 text-xs">{m.sender} · {m.time}</p>
                                    <p className="text-white/80 text-sm bg-white/5 rounded-lg px-2 py-1 mt-0.5">{m.text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-white/10 flex gap-2">
                            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendChat(); }}}
                                placeholder="Message..." className="flex-1 bg-white/5 text-white text-sm px-2 py-1.5 rounded-lg border border-white/10 focus:outline-none placeholder-white/30" />
                            <button onClick={sendChat} className="text-white/60 hover:text-white text-sm px-2">Send</button>
                        </div>
                    </div>
                )}
            </div>
            {/* Controls */}
            <div className="bg-gray-900 border-t border-white/10 py-4 flex items-center justify-center gap-3">
                <button onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}
                    className={`w-12 h-12 rounded-full text-sm font-medium flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {isMuted ? 'Mic Off' : 'Mic'}
                </button>
                <button onClick={toggleCamera} title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
                    className={`w-12 h-12 rounded-full text-sm font-medium flex items-center justify-center transition-all ${isCameraOff ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {isCameraOff ? 'Cam Off' : 'Cam'}
                </button>
                <button onClick={toggleScreenShare} title="Share screen"
                    className={`w-16 h-12 rounded-full text-xs font-medium flex items-center justify-center transition-all ${isScreenSharing ? 'bg-blue-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {isScreenSharing ? 'Stop Share' : 'Share'}
                </button>
                <div className="relative">
                    <button onClick={() => { setShowChat(v => !v); setUnreadChat(0); }} title="Chat"
                        className={`w-12 h-12 rounded-full text-sm font-medium flex items-center justify-center transition-all ${showChat ? 'bg-blue-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                        Chat
                    </button>
                    {unreadChat > 0 && !showChat && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center">{unreadChat}</span>
                    )}
                </div>
                <button onClick={leaveRoom} className="px-5 h-12 rounded-full bg-red-600 text-white text-sm font-medium flex items-center justify-center hover:bg-red-700 transition-colors ml-4" title="Leave">
                    Leave
                </button>
            </div>
        </div>
    );
}
