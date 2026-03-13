import { useEffect, useRef } from 'react';
import type { CampusChatChannel, CampusChatMessage } from '@careernest/shared';
import { Badge, Button, Card, EmptyState } from '@careernest/ui';
import { MessageSquareMore, RefreshCw, Send, Users } from 'lucide-react';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import {
    Form,
    Link,
    useActionData,
    useLoaderData,
    useNavigation,
    useRevalidator,
} from '@remix-run/react';
import { api, ApiClientError } from '@careernest/lib';
import { requireUserSession } from '~/auth.server';
import { getProfileInitials } from '~/utils/student-profile';
import { StudentMetricCard, StudentMetricGrid, StudentPageHero } from '~/components/StudentPageHero';

export const meta: MetaFunction = () => [{ title: 'Campus Chat – Student – CareerNest' }];

type ActionData = { error?: string };

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const url = new URL(request.url);

    try {
        const channelsRes = await api.campusChat.listChannels(token) as { data: CampusChatChannel[] };
        const channels = channelsRes.data || [];
        const requestedChannelId = url.searchParams.get('channelId') || '';
        const selectedChannelId = channels.find((channel) => channel.id === requestedChannelId)?.id
            || channels[0]?.id
            || '';

        const messagesRes = selectedChannelId
            ? await api.campusChat.listMessages(token, selectedChannelId) as { data: CampusChatMessage[] }
            : { data: [] as CampusChatMessage[] };

        return json({
            channels,
            selectedChannelId,
            messages: messagesRes.data || [],
        });
    } catch {
        return json({
            channels: [],
            selectedChannelId: '',
            messages: [],
        });
    }
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const formData = await request.formData();
    const channelId = String(formData.get('channelId') || '');
    const body = String(formData.get('body') || '').trim();

    if (!channelId || !body) {
        return json<ActionData>({ error: 'Select a channel and enter a message.' }, { status: 400 });
    }

    try {
        await api.campusChat.sendMessage(token, { channelId, body });
        return redirect(`/chat?channelId=${encodeURIComponent(channelId)}`);
    } catch (error) {
        const message = error instanceof ApiClientError ? error.message : 'Unable to send message right now.';
        return json<ActionData>({ error: message }, { status: 400 });
    }
}

function ChatAvatar({ message }: { message: CampusChatMessage }) {
    if (message.sender.profilePicture) {
        return (
            <img
                src={message.sender.profilePicture}
                alt={message.sender.name}
                className="h-10 w-10 rounded-2xl object-cover"
            />
        );
    }

    return (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-900 text-sm font-semibold text-white">
            {getProfileInitials(message.sender.name)}
        </div>
    );
}

export default function CampusChat() {
    const { channels, selectedChannelId, messages } = useLoaderData<typeof loader>() as {
        channels: CampusChatChannel[];
        selectedChannelId: string;
        messages: CampusChatMessage[];
    };
    const actionData = useActionData<typeof action>() as ActionData | undefined;
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const selectedChannel = channels.find((channel) => channel.id === selectedChannelId) || null;
    const isSubmitting = navigation.state === 'submitting';
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    useEffect(() => {
        if (!selectedChannelId) return;
        const interval = window.setInterval(() => {
            if (revalidator.state === 'idle') {
                revalidator.revalidate();
            }
        }, 15000);
        return () => window.clearInterval(interval);
    }, [revalidator, selectedChannelId]);

    return (
        <div className="space-y-8 animate-fade-in">
            <StudentPageHero
                tone="ink"
                badge="College-restricted chat"
                title="Campus chat built for placement discussions"
                description="Jump into channel-based conversations for projects, interview prep, referrals, and internal networking without leaving your college space."
                aside={
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                                    Channels
                                </p>
                                <p className="text-3xl font-bold text-white">{channels.length}</p>
                            </div>
                        </div>
                        <p className="text-sm leading-6 text-white/75">
                            Messages refresh automatically every 15 seconds. Only students inside the same tenant can access these rooms.
                        </p>
                    </div>
                }
            />

            <StudentMetricGrid className="xl:grid-cols-3">
                <StudentMetricCard
                    label="Channels"
                    value={channels.length}
                    hint="Topic spaces currently available in your campus server."
                    icon={<Users size={20} />}
                    tone="emerald"
                />
                <StudentMetricCard
                    label="Selected Channel"
                    value={selectedChannel?.name || 'None'}
                    hint="Where your current conversation is happening."
                    icon={<MessageSquareMore size={20} />}
                    tone="ink"
                />
                <StudentMetricCard
                    label="Loaded Messages"
                    value={messages.length}
                    hint="Messages currently visible in this room."
                    icon={<RefreshCw size={20} />}
                    tone="sky"
                />
            </StudentMetricGrid>

            {channels.length > 0 ? (
                <div className="grid gap-4 sm:gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                    <Card className="student-surface-card !p-3">
                        <div className="mb-3 flex items-center justify-between px-2">
                            <h2 className="font-semibold text-surface-900">Channels</h2>
                            <button
                                type="button"
                                onClick={() => revalidator.revalidate()}
                                className="rounded-xl p-2 text-surface-400 transition hover:bg-surface-100 hover:text-surface-700"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                        <div className="space-y-1">
                            {channels.map((channel) => (
                                <Link
                                    key={channel.id}
                                    to={`/chat?channelId=${channel.id}`}
                                    className={`block rounded-2xl px-4 py-3 transition ${
                                        channel.id === selectedChannelId
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'text-surface-600 hover:bg-surface-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{channel.name}</p>
                                            <p className="mt-1 text-sm text-surface-400">{channel.description}</p>
                                        </div>
                                        {channel.id === selectedChannelId ? (
                                            <Badge variant="bg-primary-100 text-primary-700">Live</Badge>
                                        ) : null}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </Card>

                    <div className="space-y-6">
                        <Card className="student-surface-card !p-0 overflow-hidden">
                            <div className="border-b border-surface-100 px-6 py-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-semibold text-surface-900">
                                            {selectedChannel?.name || 'Select a channel'}
                                        </h2>
                                        <p className="mt-1 text-sm text-surface-500">
                                            {selectedChannel?.description || 'Choose a channel to start chatting.'}
                                        </p>
                                    </div>
                                    <Link to="/network">
                                        <Button variant="secondary">
                                            <Users size={16} />
                                            Browse students
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            <div className="max-h-[420px] sm:max-h-[520px] space-y-4 overflow-y-auto bg-surface-50 px-4 sm:px-6 py-4 sm:py-6">
                                {messages.length > 0 ? (
                                    messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex gap-3 ${message.mine ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {!message.mine ? <ChatAvatar message={message} /> : null}
                                            <div
                                                className={`max-w-[85%] sm:max-w-xl rounded-[1.5rem] px-4 py-3 shadow-sm ${
                                                    message.mine
                                                        ? 'bg-primary-600 text-white'
                                                        : 'bg-white text-surface-700'
                                                }`}
                                            >
                                                <div className="flex flex-wrap items-center gap-2 text-xs opacity-80">
                                                    <span className="font-semibold">
                                                        {message.mine ? 'You' : message.sender.name}
                                                    </span>
                                                    {message.sender.departmentName ? (
                                                        <span className="hidden sm:inline">{message.sender.departmentName}</span>
                                                    ) : null}
                                                    <span>
                                                        {new Date(message.createdAt).toLocaleTimeString('en-IN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6">
                                                    {message.body}
                                                </p>
                                            </div>
                                            {message.mine ? <ChatAvatar message={message} /> : null}
                                        </div>
                                    ))
                                ) : (
                                    <EmptyState
                                        icon={<MessageSquareMore size={20} />}
                                        title="No messages yet"
                                        description="Start the conversation in this campus channel."
                                    />
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="border-t border-surface-100 bg-white px-4 sm:px-6 py-4 sm:py-5">
                                {actionData?.error ? (
                                    <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                        {actionData.error}
                                    </div>
                                ) : null}

                                <Form method="post" className="space-y-3">
                                    <input type="hidden" name="channelId" value={selectedChannelId} />
                                    <textarea
                                        name="body"
                                        rows={2}
                                        className="form-input min-h-[72px] resize-none"
                                        placeholder="Type your message..."
                                        disabled={!selectedChannelId || isSubmitting}
                                    />
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs text-surface-400 hidden sm:block">
                                            Only students inside your college can read and post here.
                                        </p>
                                        <Button type="submit" disabled={!selectedChannelId || isSubmitting} size="sm">
                                            <Send size={14} />
                                            {isSubmitting ? 'Sending...' : 'Send'}
                                        </Button>
                                    </div>
                                </Form>
                            </div>
                        </Card>
                    </div>
                </div>
            ) : (
                <Card className="student-surface-card">
                    <EmptyState
                        icon={<MessageSquareMore size={20} />}
                        title="Campus chat is not ready"
                        description="The required Appwrite chat collections still need to be created."
                    />
                </Card>
            )}
        </div>
    );
}
