import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import { useRouter } from 'next/navigation';
import Messages from '@/components/message/message';
import { Message, MessageType } from '@/types/message';
import { CallFrame } from '@gptscript-ai/gptscript';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

interface TaskFormModalProps {
    id: string;
}

function filterMessages(messages: any[]): any[] {
    let lastUserMessageIndex = -1;

    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
            lastUserMessageIndex = i;
            break;
        }
    }

    if (lastUserMessageIndex === -1) {
        return [];
    }

    return messages.slice(0, lastUserMessageIndex + 1);
}

function replaceProtocolWithWebSocket(url: string | undefined): string {
    if (url === undefined) {
        return '';
    }

    const parsedUrl = new URL(url);

    if (parsedUrl.protocol === 'http:') {
        parsedUrl.protocol = 'ws:';
    } else if (parsedUrl.protocol === 'https:') {
        parsedUrl.protocol = 'wss:';
    }

    return parsedUrl.toString();
}

export const Run: React.FC<TaskFormModalProps> = ({ id }) => {
    const router = useRouter();
    const [task, setTask] = useState<Task>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [message, setMessage] = useState('');
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const latestBotMessageIndex = useRef<number>(-1);
    const messagesRef = useRef(messages);
    const initialized = useRef(false);
    const [generating, setGenerating] = useState(false);
    const [running, setRunning] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, messagesRef]);

    const parseToolCall = (
        toolCall: string
    ): { tool: string; params: string } => {
        const [tool, params] = toolCall
            .replace('<tool call> ', '')
            .split(' -> ');
        return { tool, params };
    };

    const handleProgress = useCallback(
        ({
            frame,
            state,
        }: {
            frame: CallFrame;
            state: Record<string, CallFrame>;
        }) => {
            const isMainContent =
                frame.output &&
                frame.output.length > 0 &&
                (!frame.parentID || frame.tool?.chat) &&
                !frame.output[frame.output.length - 1].subCalls;

            let content = isMainContent
                ? frame.output[frame.output.length - 1].content || ''
                : '';
            if (!content) return;
            setGenerating(true);
            if (
                content === 'Waiting for model response...' &&
                latestBotMessageIndex.current !== -1 &&
                messagesRef.current[latestBotMessageIndex.current]?.message
            )
                return;

            if (content.startsWith('<tool call>')) {
                const parsedToolCall = parseToolCall(content);
                content = `Calling tool ${parsedToolCall.tool}...`;
            }

            let message: Message = {
                type: MessageType.Bot,
                message: content,
                calls: state,
                name: frame.tool?.name,
            };

            if (latestBotMessageIndex.current === -1) {
                latestBotMessageIndex.current = messagesRef.current.length;
                setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages];
                    updatedMessages.push(message);
                    return updatedMessages;
                });
            } else {
                setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages];
                    if (latestBotMessageIndex.current !== -1) {
                        updatedMessages[latestBotMessageIndex.current] =
                            message;
                    } else {
                        updatedMessages[messagesRef.current.length - 1] =
                            message;
                    }
                    return updatedMessages;
                });
            }

            if (isMainContent && frame.type == 'callFinish') {
                setGenerating(false);
                latestBotMessageIndex.current = -1;
            }
        },
        [messagesRef]
    );

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const connectWebSocket = () => {
            const s = new WebSocket(
                replaceProtocolWithWebSocket(
                    `${window.location.protocol}//${window.location.host}/api/tasks/${id}/run`
                )
            );

            s.onopen = () => {
                console.log('WebSocket connection established');
                setSocket(s);
            };

            s.onclose = () => {
                console.log('WebSocket connection closed');
                setTimeout(connectWebSocket, 5000);
            };

            s.onerror = (error) => {
                console.error('WebSocket error:', error);
                s.close();
                setSocket(null);
                initialized.current = false;
            };

            s.onmessage = (m) => {
                let data = JSON.parse(m.data);
                handleProgress({
                    frame: data.frame,
                    state: data.state,
                });
            };

            return s;
        };

        const s = connectWebSocket();

        return () => {
            if (socket?.readyState === WebSocket.OPEN) {
                socket?.close();
                setSocket(null);
                initialized.current = false;
                console.log('WebSocket connection closed gracefully');
            }
        };
    }, [handleProgress, id, socket]);

    const sendMessage = () => {
        setMessages((prevMessages) => [
            ...prevMessages,
            {
                message: message.trim(),
                type: MessageType.User,
            },
        ]);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(message.trim());
        }
        setMessage('');
    };

    useEffect(() => {
        const fetchTask = async () => {
            try {
                const response = await fetch(`/api/tasks/${id}`);
                const data = await response.json();
                if (!response.ok) {
                    if (response.status === 401) {
                        router.push('/signin');
                        return;
                    }
                    throw new Error(`Failed to fetch task ${id}`);
                }
                setTask(data);
            } catch (error) {
                router.push('/signin');
            }
        };
        fetchTask();
    }, [router, id]);

    return (
        <Stack
            spacing={3}
            sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            }}
        >
            <Stack
                spacing={3}
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                }}
            >
                <Stack spacing={1} sx={{ flex: '0 1 auto' }}>
                    <Typography variant="h3">{task?.Name}</Typography>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 'light',
                            fontSize: '1rem',
                            color: 'text.secondary',
                        }}
                    >
                        {task?.Description}
                    </Typography>
                </Stack>
                <Stack
                    sx={{
                        flex: '1 1 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        overflowY: 'auto',
                    }}
                >
                    <Card
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'auto',
                            height: '100%',
                        }}
                    >
                        <Box
                            sx={{
                                flex: 1,
                                padding: 2,
                                overflowY: 'auto',
                            }}
                        >
                            <Messages messages={messages} noAvatar={true} />
                            <div ref={messagesEndRef} />
                        </Box>
                        <Box
                            sx={{
                                padding: 2,
                                display: 'flex',
                                alignItems: 'center',
                                borderTop: '1px solid #e0e0e0',
                            }}
                        >
                            <TextField
                                variant="outlined"
                                fullWidth
                                multiline
                                rows={1}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your message"
                                onKeyPress={(e: any) => {
                                    if (e.shiftKey && e.charCode === 13) {
                                        return true;
                                    }
                                    if (e.charCode === 13) {
                                        sendMessage();
                                    }
                                }}
                            />
                            <Button
                                variant="contained"
                                disabled={generating}
                                color="primary"
                                onClick={sendMessage}
                                sx={{ marginLeft: 2 }}
                            >
                                Send
                            </Button>
                        </Box>
                    </Card>
                </Stack>
            </Stack>
        </Stack>
    );
};

export default Run;