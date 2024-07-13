import { ReactNode } from 'react';
import { CallFrame } from '@gptscript-ai/gptscript';

export enum MessageType {
    User,
    Bot,
    Alert,
}

export interface ChatMessage {
    type: MessageType;
    message?: string;
    error?: string;
    name?: string;
    calls?: Record<string, CallFrame>;
    component?: ReactNode;
}

export interface Message {
    ID: string;
    TaskID: string;
    TaskName: string;
    CreatedAt: Date;
    Content: string;
    Read: boolean;
}
