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
        { urls: 'stun:stun2.l.google.com:19302' },
    ],
};

const SIGNAL_POLL_INTERVAL = 1500; // ms

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    const roomId = params.roomId!;

    let roomInfo: any = null;
    try {
        const res = await api.interviews.getRoomDetails(token, roomId) as any;
        roomInfo = res.data || res;
    } catch (err: any) {
        roomInfo = {
            roomId,
            status: 'unknown',
            error: err?.message || 'Room not found',
        };
    }

    return json({
        token,
        user,
        roomId,
        roomInfo,
    });
}

// ─── Types ────────────────────────────────────────────────
interface Participant {
    id: string;
    name: string;
    stream: MediaStream | null;
    isMuted: boolean;
    isCameraOff: boolean;
    isScreenSharing: boolean;
}

interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    time: string;
}

// ─── Icons (inline SVG to avoid lucide-react in island) ──
const MicIcon = ({ off }: { off?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {off ? (
            <>
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
            </>
        ) : (
            <>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
            </>
        )}
    </svg>
);

const CamIcon = ({ off }: { off?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {off ? (
            <>
                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                <line x1="1" y1="1" x2="23" y2="23" />
            </>
        ) : (
            <>
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </>
        )}
    </svg>
);

const PhoneOffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 3.43 8.64 19.86 19.86 0 0 1 .36 0a2 2 0 0 1 2-2.18h3A2 2 0 0 1 7.5.82 12.84 12.84 0 0 0 8.2 3.63a2 2 0 0 1-.45 2.11L6.48 7.01" />
        <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
);

const MonitorIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

const ChatIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

const PeopleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

function VideoTile({ stream, name, isMuted, isCameraOff, isLocal = false }: {
    stream: MediaStream | null;
    name: string;
    isMuted: boolean;
    isCameraOff: boolean;
    isLocal?: boolean;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

    return (
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center aspect-video">
            {stream && !isCameraOff ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal} // Always mute local video to prevent echo
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {initials}
                    </div>
                    <p className="text-white/60 text-sm">{isCameraOff ? 'Camera off' : 'No video'}</p>
                </div>
            )}
            {/* Name tag */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs font-medium">
                    {name}{isLocal && ' (You)'}
                </span>
                {isMuted && (
                    <span className="w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                        </svg>
                    </span>
                )}
            </div>
            {/* Local indicator */}
            {isLocal && !isCameraOff && stream && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
        </div>
    );
}

// ─── Main Interview Room Component ────────────────────────
function InterviewRoom({ token, roomId, user, roomInfo }: {
    token: string;
    roomId: string;
    user: any;
    roomInfo: any;
}) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteParticipants, setRemoteParticipants] = useState<Map<string, Participant>>(new Map());
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const [hasLeft, setHasLeft] = useState(false);
    const [error, setError] = useState('');
    const [unreadChat, setUnreadChat] = useState(0);

    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const lastSignalTime = useRef<string>('');
    const pollRef = useRef<NodeJS.Timeout | null>(null);
    const screenStream = useRef<MediaStream | null>(null);

    // ── Initialize local media ──────────────────────────────
    const initMedia = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                audio: { echoCancellation: true, noiseSuppression: true },
            });
            setLocalStream(stream);
            setConnectionStatus('connected');
            return stream;
        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                setError('Camera/microphone access denied. Please allow access in your browser settings.');
            } else {
                // Try audio only
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    setLocalStream(audioStream);
                    setIsCameraOff(true);
                    setConnectionStatus('connected');
                    return audioStream;
                } catch {
                    setError('Could not access microphone. Please check your device settings.');
                }
            }
            return null;
        }
    }, []);

    // ── Create RTCPeerConnection for a participant ──────────
    const createPeerConnection = useCallback((peerId: string, stream: MediaStream | null) => {
        const pc = new RTCPeerConnection(STUN_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                api.interviewSignal.send(token, roomId, {
                    type: 'candidate',
                    targetId: peerId,
                    data: JSON.stringify(event.candidate),
                }).catch(() => {});
            }
        };

        pc.ontrack = (event) => {
            const remoteStream = event.streams[0];
            setRemoteParticipants(prev => {
                const next = new Map(prev);
                const existing = next.get(peerId) || { id: peerId, name: 'Participant', stream: null, isMuted: false, isCameraOff: false, isScreenSharing: false };
                next.set(peerId, { ...existing, stream: remoteStream });
                return next;
            });
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                setRemoteParticipants(prev => {
                    const next = new Map(prev);
                    next.delete(peerId);
                    return next;
                });
                peerConnections.current.delete(peerId);
            }
        };

        // Add local tracks to connection
        if (stream) {
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }

        peerConnections.current.set(peerId, pc);
        return pc;
    }, [token, roomId]);

    // ── Process incoming signals ────────────────────────────
    const processSignals = useCallback(async (stream: MediaStream | null) => {
        try {
            const res = await api.interviewSignal.poll(token, roomId, lastSignalTime.current || undefined) as any;
            const signals = (res.data?.signals || res.signals || []);

            for (const signal of signals) {
                // Skip own signals
                if (signal.senderId === user.$id) {
                    lastSignalTime.current = signal.$createdAt;
                    continue;
                }

                const signalData = typeof signal.data === 'string' ? JSON.parse(signal.data) : signal.data;
                lastSignalTime.current = signal.$createdAt;

                switch (signal.type) {
                    case 'join': {
                        // New peer joined — create connection and send offer
                        setRemoteParticipants(prev => {
                            const next = new Map(prev);
                            if (!next.has(signal.senderId)) {
                                next.set(signal.senderId, {
                                    id: signal.senderId,
                                    name: signal.senderName || 'Participant',
                                    stream: null,
                                    isMuted: false,
                                    isCameraOff: false,
                                    isScreenSharing: false,
                                });
                            }
                            return next;
                        });

                        // Create offer for the new peer
                        const pc = createPeerConnection(signal.senderId, stream);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);

                        await api.interviewSignal.send(token, roomId, {
                            type: 'offer',
                            targetId: signal.senderId,
                            data: JSON.stringify(offer),
                        });
                        break;
                    }

                    case 'offer': {
                        if (signal.targetId && signal.targetId !== user.$id) break;
                        const pc = createPeerConnection(signal.senderId, stream);
                        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        await api.interviewSignal.send(token, roomId, {
                            type: 'answer',
                            targetId: signal.senderId,
                            data: JSON.stringify(answer),
                        });
                        break;
                    }

                    case 'answer': {
                        if (signal.targetId && signal.targetId !== user.$id) break;
                        const pc = peerConnections.current.get(signal.senderId);
                        if (pc && pc.signalingState !== 'stable') {
                            await pc.setRemoteDescription(new RTCSessionDescription(signalData));
                        }
                        break;
                    }

                    case 'candidate': {
                        if (signal.targetId && signal.targetId !== user.$id) break;
                        const pc = peerConnections.current.get(signal.senderId);
                        if (pc && pc.remoteDescription) {
                            await pc.addIceCandidate(new RTCIceCandidate(signalData));
                        }
                        break;
                    }

                    case 'chat': {
                        const chatMsg: ChatMessage = {
                            id: signal.$id,
                            sender: signal.senderName || 'Participant',
                            text: signalData.text || '',
                            time: new Date(signal.$createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                        };
                        setChatMessages(prev => [...prev, chatMsg]);
                        if (!showChat) setUnreadChat(n => n + 1);
                        break;
                    }

                    case 'mute_status': {
                        setRemoteParticipants(prev => {
                            const next = new Map(prev);
                            const existing = next.get(signal.senderId);
                            if (existing) {
                                next.set(signal.senderId, {
                                    ...existing,
                                    isMuted: signalData.isMuted,
                                    isCameraOff: signalData.isCameraOff,
                                });
                            }
                            return next;
                        });
                        break;
                    }

                    case 'leave': {
                        setRemoteParticipants(prev => {
                            const next = new Map(prev);
                            next.delete(signal.senderId);
                            return next;
                        });
                        const pc = peerConnections.current.get(signal.senderId);
                        if (pc) {
                            pc.close();
                            peerConnections.current.delete(signal.senderId);
                        }
                        break;
                    }
                }
            }
        } catch {
            // Ignore polling errors
        }
    }, [token, roomId, user.$id, createPeerConnection, showChat]);

    // ── Initialize and start polling ────────────────────────
    useEffect(() => {
        let stream: MediaStream | null = null;

        const init = async () => {
            stream = await initMedia();

            // Send join signal
            await api.interviewSignal.send(token, roomId, {
                type: 'join',
                data: JSON.stringify({ userId: user.$id, name: user.name }),
            }).catch(() => {});

            // Start polling
            pollRef.current = setInterval(() => processSignals(stream), SIGNAL_POLL_INTERVAL);
        };

        init();

        return () => {
            // Cleanup on unmount
            if (pollRef.current) clearInterval(pollRef.current);

            api.interviewSignal.send(token, roomId, {
                type: 'leave',
                data: JSON.stringify({ userId: user.$id }),
            }).catch(() => {});

            // Stop all tracks
            stream?.getTracks().forEach(t => t.stop());
            screenStream.current?.getTracks().forEach(t => t.stop());

            // Close all peer connections
            peerConnections.current.forEach(pc => pc.close());
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Controls ────────────────────────────────────────────
    const toggleMute = useCallback(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(t => { t.enabled = isMuted; }); // toggle: if was muted, unmute
            const newMuted = !isMuted;
            setIsMuted(newMuted);
            api.interviewSignal.send(token, roomId, {
                type: 'mute_status',
                data: JSON.stringify({ isMuted: newMuted, isCameraOff }),
            }).catch(() => {});
        }
    }, [localStream, isMuted, isCameraOff, token, roomId]);

    const toggleCamera = useCallback(() => {
        if (localStream) {
            localStream.getVideoTracks().forEach(t => { t.enabled = isCameraOff; });
            const newOff = !isCameraOff;
            setIsCameraOff(newOff);
            api.interviewSignal.send(token, roomId, {
                type: 'mute_status',
                data: JSON.stringify({ isMuted, isCameraOff: newOff }),
            }).catch(() => {});
        }
    }, [localStream, isCameraOff, isMuted, token, roomId]);

    const toggleScreenShare = useCallback(async () => {
        if (isScreenSharing) {
            // Stop screen share
            screenStream.current?.getTracks().forEach(t => t.stop());
            screenStream.current = null;
            setIsScreenSharing(false);

            // Switch back to camera for all peers
            if (localStream) {
                const videoTrack = localStream.getVideoTracks()[0];
                if (videoTrack) {
                    peerConnections.current.forEach(pc => {
                        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                        if (sender && videoTrack) sender.replaceTrack(videoTrack);
                    });
                }
            }
        } else {
            try {
                const screen = await (navigator.mediaDevices as any).getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: false,
                });
                screenStream.current = screen;
                setIsScreenSharing(true);

                const videoTrack = screen.getVideoTracks()[0];
                if (videoTrack) {
                    peerConnections.current.forEach(pc => {
                        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                        if (sender) sender.replaceTrack(videoTrack);
                    });

                    videoTrack.onended = () => {
                        setIsScreenSharing(false);
                        screenStream.current = null;
                    };
                }
            } catch (err: any) {
                if (err.name !== 'NotAllowedError') {
                    console.error('Screen share error:', err);
                }
            }
        }
    }, [isScreenSharing, localStream]);

    const sendChat = useCallback(async () => {
        if (!chatInput.trim()) return;
        const text = chatInput.trim();
        setChatInput('');

        const msg: ChatMessage = {
            id: Date.now().toString(),
            sender: user.name + ' (You)',
            text,
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages(prev => [...prev, msg]);

        await api.interviewSignal.send(token, roomId, {
            type: 'chat',
            data: JSON.stringify({ text }),
        }).catch(() => {});
    }, [chatInput, token, roomId, user.name]);

    const leaveRoom = useCallback(async () => {
        if (pollRef.current) clearInterval(pollRef.current);

        await api.interviewSignal.send(token, roomId, {
            type: 'leave',
            data: JSON.stringify({ userId: user.$id }),
        }).catch(() => {});

        localStream?.getTracks().forEach(t => t.stop());
        screenStream.current?.getTracks().forEach(t => t.stop());
        peerConnections.current.forEach(pc => pc.close());

        setHasLeft(true);
    }, [token, roomId, user.$id, localStream]);

    // ── If room has error ──────────────────────────────────
    if (roomInfo?.error) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center p-8">
                    <div className="text-red-400 text-6xl mb-4">⚠️</div>
                    <h1 className="text-white text-xl font-semibold mb-2">Room Not Found</h1>
                    <p className="text-gray-400 text-sm mb-6">{roomInfo.error}</p>
                    <button onClick={() => window.history.back()} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (hasLeft) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center p-8">
                    <div className="text-5xl mb-4">👋</div>
                    <h1 className="text-white text-xl font-semibold mb-2">You've left the interview</h1>
                    <p className="text-gray-400 text-sm mb-6">The interview has ended. Good luck!</p>
                    <button onClick={() => window.history.back()} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const totalParticipants = remoteParticipants.size + 1;
    const gridCols = totalParticipants === 1 ? 'grid-cols-1' :
        totalParticipants === 2 ? 'grid-cols-2' :
        totalParticipants <= 4 ? 'grid-cols-2' :
        'grid-cols-3';

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col select-none">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-900/80 backdrop-blur-sm border-b border-white/5">
                <div className="flex items-center gap-3">
                    <span className="text-white font-semibold text-sm">CareerNest Interview</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
                        connectionStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400 animate-pulse' :
                        'bg-red-500/20 text-red-400'
                    }`}>
                        {connectionStatus === 'connected' ? 'Connected' :
                         connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <span>{totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}</span>
                    {roomInfo?.scheduledAt && (
                        <span>· {new Date(roomInfo.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="bg-red-900/50 border-b border-red-500/30 px-6 py-3 text-red-300 text-sm text-center">
                    {error}
                </div>
            )}

            {/* Main area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Video Grid */}
                <div className="flex-1 p-4 overflow-auto">
                    <div className={`grid ${gridCols} gap-3 h-full`}>
                        {/* Local video */}
                        <VideoTile
                            stream={isScreenSharing ? screenStream.current : localStream}
                            name={user.name}
                            isMuted={isMuted}
                            isCameraOff={isCameraOff && !isScreenSharing}
                            isLocal={true}
                        />
                        {/* Remote participants */}
                        {Array.from(remoteParticipants.values()).map(p => (
                            <VideoTile
                                key={p.id}
                                stream={p.stream}
                                name={p.name}
                                isMuted={p.isMuted}
                                isCameraOff={p.isCameraOff}
                            />
                        ))}
                    </div>

                    {/* Waiting message when alone */}
                    {remoteParticipants.size === 0 && connectionStatus === 'connected' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <div className="w-16 h-16 border-2 border-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-white/40 text-2xl">⏳</span>
                                </div>
                                <p className="text-white/50 text-sm">Waiting for others to join...</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Side Panel: Chat or Participants */}
                {(showChat || showParticipants) && (
                    <div className="w-72 border-l border-white/10 bg-gray-900 flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <div className="flex gap-1">
                                <button
                                    onClick={() => { setShowChat(true); setShowParticipants(false); setUnreadChat(0); }}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${showChat ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
                                >
                                    Chat {unreadChat > 0 && !showChat && <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1">{unreadChat}</span>}
                                </button>
                                <button
                                    onClick={() => { setShowParticipants(true); setShowChat(false); }}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${showParticipants ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
                                >
                                    People
                                </button>
                            </div>
                            <button onClick={() => { setShowChat(false); setShowParticipants(false); }} className="text-white/40 hover:text-white text-lg leading-none">×</button>
                        </div>

                        {showChat && (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {chatMessages.length === 0 && (
                                        <p className="text-white/30 text-xs text-center mt-4">No messages yet. Say something!</p>
                                    )}
                                    {chatMessages.map(msg => (
                                        <div key={msg.id} className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/70 text-xs font-medium">{msg.sender}</span>
                                                <span className="text-white/30 text-xs">{msg.time}</span>
                                            </div>
                                            <p className="text-white/80 text-sm leading-relaxed bg-white/5 rounded-xl px-3 py-2">{msg.text}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 border-t border-white/10">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }}}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-white/5 text-white text-sm px-3 py-2 rounded-xl border border-white/10 focus:border-blue-500 focus:outline-none placeholder-white/30"
                                        />
                                        <button onClick={sendChat} disabled={!chatInput.trim()}
                                            className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                            →
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {showParticipants && (
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {/* Local */}
                                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-medium">{user.name} (You)</p>
                                        <p className="text-white/40 text-xs">{isMuted ? 'Muted' : 'Unmuted'}</p>
                                    </div>
                                </div>
                                {Array.from(remoteParticipants.values()).map(p => (
                                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold">
                                            {p.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">{p.name}</p>
                                            <p className="text-white/40 text-xs">{p.isMuted ? 'Muted' : 'Unmuted'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className="bg-gray-900/90 backdrop-blur-md border-t border-white/10 px-8 py-4">
                <div className="flex items-center justify-center gap-4">
                    {/* Mic */}
                    <button
                        onClick={toggleMute}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            isMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        <MicIcon off={isMuted} />
                    </button>

                    {/* Camera */}
                    <button
                        onClick={toggleCamera}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            isCameraOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
                    >
                        <CamIcon off={isCameraOff} />
                    </button>

                    {/* Screen Share */}
                    <button
                        onClick={toggleScreenShare}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            isScreenSharing ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                    >
                        <MonitorIcon />
                    </button>

                    {/* Chat */}
                    <button
                        onClick={() => { setShowChat(v => { const n = !v; if (n) setUnreadChat(0); return n; }); setShowParticipants(false); }}
                        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            showChat ? 'bg-blue-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title="Chat"
                    >
                        <ChatIcon />
                        {unreadChat > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                                {unreadChat}
                            </span>
                        )}
                    </button>

                    {/* Participants */}
                    <button
                        onClick={() => { setShowParticipants(v => !v); setShowChat(false); }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            showParticipants ? 'bg-blue-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title="Participants"
                    >
                        <PeopleIcon />
                    </button>

                    {/* Leave */}
                    <button
                        onClick={leaveRoom}
                        className="w-14 h-12 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors ml-4"
                        title="Leave call"
                    >
                        <PhoneOffIcon />
                    </button>
                </div>

                {/* Room ID */}
                <p className="text-center text-white/20 text-xs mt-2">
                    Room: {roomId}
                </p>
            </div>
        </div>
    );
}

// ─── Page Export ──────────────────────────────────────────
export default function InterviewRoomPage() {
    const { token, user, roomId, roomInfo } = useLoaderData<typeof loader>();

    return (
        <InterviewRoom
            token={token}
            roomId={roomId}
            user={user}
            roomInfo={roomInfo}
        />
    );
}
