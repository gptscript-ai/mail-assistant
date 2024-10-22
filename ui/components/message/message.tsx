import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeExternalLinks from 'rehype-external-links';
import { ChatMessage, MessageType } from '@/types/message';
import Calls from '@/components/message/calls';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import MicrosoftIcon from '@/components/icons/microsoft';

const M = ({ message }: { message: ChatMessage }) => {
    switch (message.type) {
        case MessageType.User:
            return (
                <Box className="flex flex-col items-end mb-10">
                    <p className="whitespace-pre-wrap rounded-2xl bg-blue-500 text-white py-2 px-4 max-w-full">
                        {message.message}
                    </p>
                </Box>
            );
        case MessageType.Bot:
            return (
                <Box className="flex flex-col items-start mb-10">
                    <Stack direction="row" className="flex gap-2 w-full">
                        <Tooltip title="Sent from System">
                            <Avatar
                                sx={{ width: 40, height: 40, bgcolor: 'white' }}
                            >
                                <MicrosoftIcon
                                    sx={{ width: '100%', height: '100%' }}
                                />
                            </Avatar>
                        </Tooltip>
                        <Stack direction="column" className="flex gap-2 w-full">
                            <Box
                                className={`w-[93%] rounded-2xl text-black dark:text-white pt-1 px-4 border dark:border-none dark:bg-zinc-900 ${message.error ? 'border-danger dark:border-danger' : ''}`}
                            >
                                {message.message && (
                                    <Markdown
                                        className={`!text-wrap prose overflow-x-auto dark:prose-invert p-4 !w-full !max-w-full prose-thead:text-left prose-img:rounded-xl prose-img:shadow-lg`}
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[
                                            [
                                                rehypeExternalLinks,
                                                { target: '_blank' },
                                            ],
                                        ]}
                                    >
                                        {message.message}
                                    </Markdown>
                                )}
                                {message.component}
                            </Box>
                            {message.calls && (
                                <Box className="w-[94%] flex justify-end mt-2">
                                    <Calls calls={message.calls} />
                                </Box>
                            )}
                        </Stack>
                    </Stack>
                </Box>
            );
        case MessageType.Alert:
            return (
                <div className="flex flex-col items-start mb-10">
                    <div className="flex gap-2 w-full">
                        <div className="w-full flex justify-center space-x-2 rounded-2xl text-black text-sm bg-gray-50 shadow text-center py-2 px-4 dark:text-white dark:border-zinc-800 dark:border dark:bg-black">
                            <div className="w-2 h-2 my-auto bg-green-500 rounded-full"></div>
                            <p>{message.message}</p>
                        </div>
                    </div>
                </div>
            );
    }
};

const Messages = ({ messages }: { messages: ChatMessage[] }) => (
    <div>
        {messages.map((message, index) => (
            <M key={index} message={message} />
        ))}
    </div>
);

export default Messages;
