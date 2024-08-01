export interface User {
    id: string;
    name?: string;
    avatar?: string;
    email?: string;
    subscriptionDisabled?: boolean;
    checkSpam?: boolean;

    [key: string]: unknown;
}
