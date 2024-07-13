import React, { useState } from 'react';
import { List, ListItem, ListItemText, Typography } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import { format } from 'timeago.js';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import { useRouter } from 'next/navigation';
import { Wrench } from '@phosphor-icons/react/dist/ssr/Wrench';
import { Bell } from '@phosphor-icons/react/dist/ssr/Bell';
import { BellRinging } from '@phosphor-icons/react/dist/ssr/BellRinging';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { Message } from '@/types/message';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Badge from '@mui/material/Badge';

interface MessageListProps {
    messages: Message[];
}

// sx styles
const avatarSX = {
    width: 36,
    height: 36,
    fontSize: '1rem',
};

const actionSX = {
    mt: '6px',
    ml: 1,
    top: 'auto',
    right: 'auto',
    alignSelf: 'flex-start',
    transform: 'none',
};

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
    const router = useRouter();
    const [visibleCount, setVisibleCount] = useState<number>(4);

    const handleViewAll = () => {
        setVisibleCount((prevCount) => prevCount + 4);
    };

    const handleMessageClick = async (m: Message) => {
        await fetch(`/api/messages/${m.ID}`, {
            method: 'POST',
        });

        const path = window.location.pathname;

        if (path === `/task/${m.TaskID}`) {
            window.location.reload();
        } else {
            router.push(`/task/${m.TaskID}`);
        }
    };

    return (
        <div>
            <List
                component="nav"
                sx={{
                    p: 0,
                    '& .MuiListItemButton-root': {
                        py: 0.5,
                        '&.Mui-selected': {
                            bgcolor: 'grey.50',
                            color: 'text.primary',
                        },
                        '& .MuiAvatar-root': avatarSX,
                        '& .MuiListItemSecondaryAction-root': {
                            ...actionSX,
                            position: 'relative',
                        },
                    },
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {messages.slice(0, visibleCount).map((message) => (
                    // eslint-disable-next-line react/jsx-key
                    <ListItemButton
                        sx={{
                            bgcolor: message.Read
                                ? 'background.paper'
                                : 'primary.lighter',
                        }}
                        onClick={() => handleMessageClick(message)}
                    >
                        <ListItemAvatar
                            sx={{
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Avatar
                                sx={{
                                    color: 'primary.main',
                                }}
                            >
                                <Badge
                                    variant="dot"
                                    color="error"
                                    invisible={message.Read}
                                    overlap="circular"
                                >
                                    <BellRinging size={24} />
                                </Badge>
                            </Avatar>
                        </ListItemAvatar>
                        <ListItem
                            key={message.ID}
                            sx={{
                                fontWeight: message.Read ? 'normal' : 'bold',
                            }}
                        >
                            <ListItemText
                                primary={
                                    <Typography variant="h6">
                                        {message.Content}
                                    </Typography>
                                }
                                secondary={
                                    <Stack direction="row">
                                        <Wrench size={20} />
                                        <Typography
                                            sx={{ ml: '4px' }}
                                            variant="h6"
                                        >
                                            {message.TaskName}
                                        </Typography>
                                    </Stack>
                                }
                            />
                        </ListItem>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '100px',
                            }}
                        >
                            <ListItemSecondaryAction>
                                <Typography variant="caption" noWrap>
                                    {format(message.CreatedAt, 'en_us')}
                                </Typography>
                            </ListItemSecondaryAction>
                        </Box>
                    </ListItemButton>
                ))}
            </List>
            {visibleCount < messages.length && (
                <ListItemButton
                    onClick={handleViewAll}
                    sx={{ textAlign: 'center', py: `${12}px !important` }}
                >
                    <ListItemText
                        primary={
                            <Typography variant="h6" color="primary">
                                View All
                            </Typography>
                        }
                    />
                </ListItemButton>
            )}
        </div>
    );
};

export default MessageList;
