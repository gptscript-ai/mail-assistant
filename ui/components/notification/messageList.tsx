import React, { useState } from 'react';
import {
    Button,
    List,
    ListItem,
    ListItemText,
    Typography,
} from '@mui/material';
import Avatar from '@mui/material/Avatar';
import { MessageOutlined } from '@ant-design/icons';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import { format, render, cancel, register } from 'timeago.js';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import { router } from 'next/client';
import { useRouter } from 'next/navigation';

export interface Message {
    ID: string;
    TaskID: string;
    TaskName: string;
    CreatedAt: Date;
    Content: string;
    Read: boolean;
}

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
        const response = await fetch(`/api/messages/${m.ID}`, {
            method: 'POST',
        });

        const path = window.location.pathname;
        console.log(path);

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
                }}
            >
                {messages.slice(0, visibleCount).map((message) => (
                    // eslint-disable-next-line react/jsx-key
                    <ListItemButton onClick={() => handleMessageClick(message)}>
                        <ListItemAvatar>
                            <Avatar
                                sx={{
                                    color: 'primary.main',
                                    bgcolor: 'primary.lighter',
                                }}
                            >
                                <MessageOutlined />
                            </Avatar>
                        </ListItemAvatar>
                        <ListItem key={message.ID}>
                            <ListItemText
                                primary={
                                    <Typography variant="h6">
                                        {message.Content}
                                    </Typography>
                                }
                                secondary={message.TaskName}
                            />
                        </ListItem>
                        <ListItemSecondaryAction>
                            <Typography variant="caption" noWrap>
                                {format(message.CreatedAt, 'en_us')}
                            </Typography>
                        </ListItemSecondaryAction>
                    </ListItemButton>
                ))}
            </List>
            {visibleCount < messages.length && (
                <Button
                    onClick={handleViewAll}
                    variant="contained"
                    color="primary"
                >
                    View All
                </Button>
            )}
        </div>
    );
};

export default MessageList;
