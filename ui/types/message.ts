import type { CallFrame } from '@gptscript-ai/gptscript';
import { ReactNode } from 'react';

export enum MessageType {
    User,
    Bot,
    Alert,
}

export interface Message {
    type: MessageType;
    message?: string;
    error?: string;
    name?: string;
    calls?: Record<string, CallFrame>;
    component?: ReactNode;
}
