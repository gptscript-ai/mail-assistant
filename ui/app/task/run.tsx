import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import { useRouter } from 'next/navigation';
import Messages from '@/components/message/message';
import { ChatMessage, MessageType } from '@/types/message';
import { CallFrame } from '@gptscript-ai/gptscript';
import { Note } from '@phosphor-icons/react/dist/ssr/Note';
import { Task } from '@/types/task';

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
    const [messages, setMessages] = useState<ChatMessage[]>([]);
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
        task?.Messages?.filter((m) => !m.Read).forEach((m) => {
            fetch(`/api/messages/${m.ID}`, {
                method: 'POST',
            });
        });
    }, [task]);

    useEffect(() => {
        if (task?.State) {
            const state = JSON.parse(
                Buffer.from(task.State, 'base64').toString('utf-8')
            );
            let messagesFromState =
                state?.continuation?.state?.completion?.messages;
            if (messagesFromState) {
                let messages = messagesFromState.filter((m: any) => {
                    return (
                        (m.role === 'user' || m.role === 'assistant') &&
                        m.content instanceof Array &&
                        m.content[0] &&
                        m.content[0].text
                    );
                });
                const messagesFiltered: ChatMessage[] = messages.map(
                    (m: any) => {
                        return {
                            type:
                                m.role === 'user'
                                    ? MessageType.User
                                    : MessageType.Bot,
                            message: m.content[0].text,
                        };
                    }
                );

                const filteredMessages: ChatMessage[] = [];
                let lastUserMessageIndex = -1;

                for (let i = 0; i < messagesFiltered.length; i++) {
                    if (messagesFiltered[i].type === MessageType.User) {
                        lastUserMessageIndex = i;
                    }
                }

                // Add messages up to the last user message
                for (let i = 0; i <= lastUserMessageIndex; i++) {
                    filteredMessages.push(messagesFiltered[i]);
                }

                // Add the last assistant message if there are any assistant messages after the last user message
                if (lastUserMessageIndex < messagesFiltered.length - 1) {
                    for (
                        let i = messagesFiltered.length - 1;
                        i > lastUserMessageIndex;
                        i--
                    ) {
                        if (messagesFiltered[i].type === MessageType.Bot) {
                            filteredMessages.push(messagesFiltered[i]);
                            break;
                        }
                    }
                }
                setMessages(filteredMessages);
                latestBotMessageIndex.current = filteredMessages.length;
            }
        }
    }, [task]);

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
                content === '⏳⏳⏳ Waiting for model response...' &&
                latestBotMessageIndex.current !== -1 &&
                messagesRef.current[latestBotMessageIndex.current]?.message
            )
                return;

            if (content.startsWith('<tool call>')) {
                const parsedToolCall = parseToolCall(content);
                content = `🛠️ Calling tool ${parsedToolCall.tool}...`;
            }

            let message: ChatMessage = {
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
                const taskResponse = await fetch(`/api/tasks/${id}`);
                const task: Task = await taskResponse.json();

                const addQueryParams = (
                    baseUrl: string,
                    params: { [key: string]: string }
                ): string => {
                    const url = new URL(baseUrl, window.location.origin);
                    Object.keys(params).forEach((key) =>
                        url.searchParams.append(key, params[key])
                    );
                    return url.toString();
                };

                const messagesResponse = await fetch(
                    addQueryParams('/api/messages', {
                        taskId: task.ID,
                    })
                );
                task.Messages = await messagesResponse.json();
                setTask(task);
            } catch (error) {
                console.error(error);
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
                    <Stack direction="row">
                        <Note size={24} />
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
