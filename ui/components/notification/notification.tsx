import { useRef, useState, MouseEvent, useEffect } from 'react';

// material-ui
import { useTheme, Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Badge from '@mui/material/Badge';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';

// project import
import Transitions from '@/components/@extended/Transitions';

// assets
import { BellOutlined, CheckCircleOutlined } from '@ant-design/icons';
import MainCard from '@/components/card/MainCard';
import MessageList, { Message } from '@/components/notification/messageList';
import { useRouter } from 'next/navigation';

// ==============================|| HEADER CONTENT - NOTIFICATION ||============================== //

export default function Notification() {
    const theme: any = useTheme();
    const matchesXs = useMediaQuery(theme.breakpoints.down('md'));

    const router = useRouter();
    const anchorRef = useRef<any>(null);
    const [read, setRead] = useState<number>(0);
    const [open, setOpen] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([]);

    const fetchMessages = async () => {
        try {
            const response = await fetch('/api/messages');
            let messages: Message[] = await response.json();
            if (messages) {
                messages = await Promise.all(
                    messages.map(async (m) => {
                        const taskId = m.TaskID;
                        const taskResponse = await fetch(
                            `/api/tasks/${taskId}`
                        );
                        const task: Task = await taskResponse.json();
                        m.TaskName = task.Name;
                        return m;
                    })
                );
                setMessages(messages);
                setRead(() => {
                    return messages.filter((m) => !m.Read).length;
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchMessages();
        setInterval(() => fetchMessages(), 5000);
    }, []);

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    const handleClose = (event: any) => {
        if (
            anchorRef.current &&
            anchorRef.current.contains(event.target as Node)
        ) {
            return;
        }
        setOpen(false);
    };

    const iconBackColorOpen = 'grey.100';

    return (
        <Box sx={{ flexShrink: 0, ml: 0.75 }}>
            <IconButton
                color="secondary"
                sx={{
                    color: 'text.primary',
                    bgcolor: open ? iconBackColorOpen : 'transparent',
                }}
                aria-label="open profile"
                ref={anchorRef}
                aria-controls={open ? 'profile-grow' : undefined}
                aria-haspopup="true"
                onClick={handleToggle}
            >
                <Badge badgeContent={read} color="primary">
                    <BellOutlined />
                </Badge>
            </IconButton>
            <Popper
                placement={matchesXs ? 'bottom' : 'bottom-end'}
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                modifiers={[
                    {
                        name: 'offset',
                        options: { offset: [matchesXs ? -5 : 0, 9] },
                    },
                ]}
            >
                {({ TransitionProps }) => (
                    <Transitions
                        type="grow"
                        position={matchesXs ? 'top' : 'top-right'}
                        in={open}
                        {...TransitionProps}
                    >
                        <Paper
                            sx={{
                                boxShadow: theme.customShadows.z1,
                                width: '100%',
                                minWidth: 285,
                                maxWidth: { xs: 285, md: 420 },
                            }}
                        >
                            <ClickAwayListener onClickAway={handleClose}>
                                <MainCard
                                    title="Notification"
                                    elevation={0}
                                    border={false}
                                    content={false}
                                    secondary={
                                        <>
                                            {read > 0 && (
                                                <Tooltip title="Mark as all read">
                                                    <IconButton
                                                        color="success"
                                                        size="small"
                                                        onClick={() =>
                                                            setRead(0)
                                                        }
                                                    >
                                                        <CheckCircleOutlined
                                                            style={{
                                                                fontSize:
                                                                    '1.15rem',
                                                            }}
                                                        />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </>
                                    }
                                >
                                    <MessageList messages={messages} />
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Transitions>
                )}
            </Popper>
        </Box>
    );
}
