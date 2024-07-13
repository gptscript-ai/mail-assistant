import { Message } from '@/types/message';

export interface Task {
    Name: string;
    Description: string;
    ID: string;
    CreatedAt: string;
    State: string;
    Checked: string;
    Context: string;
    ContextIds: string[];
    RepliedEmails: string;
    Messages: Message[];
}
