import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeExternalLinks from 'rehype-external-links';
import { Avatar, Tooltip } from '@nextui-org/react';
import { Message, MessageType } from '@/types/message';

const abbreviate = (name: string) => {
    const words = name.split(/(?=[A-Z])|[\s_-]/);
    const firstLetters = words.map((word) => word[0]);
    return firstLetters.slice(0, 2).join('').toUpperCase();
};

const M = ({ message, noAvatar }: { message: Message; noAvatar?: boolean }) => {
    switch (message.type) {
        case MessageType.User:
            return (
                <div className="flex flex-col items-end mb-10">
                    <p className="whitespace-pre-wrap rounded-2xl bg-blue-500 text-white py-2 px-4 max-w-full">
                        {message.message}
                    </p>
                </div>
            );
        case MessageType.Bot:
            return (
                <div className="flex flex-col items-start mb-10">
                    <div className="flex gap-2 w-full">
                        {!noAvatar && (
                            <Tooltip
                                content={`Sent from ${message.name || 'System'}`}
                                placement="bottom"
                                closeDelay={0.5}
                            >
                                <Avatar
                                    showFallback
                                    name={abbreviate(message.name || 'System')}
                                    className="w-[40px] cursor-default"
                                    classNames={{
                                        base: `bg-white p-6 text-sm border dark:border-none dark:bg-zinc-900 ${message.error && 'border-danger dark:border-danger'}`,
                                    }}
                                />
                            </Tooltip>
                        )}
                        <div
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
                        </div>
                    </div>
                </div>
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

const Messages = ({
    messages,
    noAvatar,
}: {
    messages: Message[];
    noAvatar?: boolean;
}) => (
    <div>
        {messages.map((message, index) => (
            <M key={index} message={message} noAvatar={noAvatar} />
        ))}
    </div>
);

export default Messages;
