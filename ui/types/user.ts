export interface User {
    id: string;
    name?: string;
    avatar?: string;
    email?: string;
    subscriptionDisabled?: boolean;

    [key: string]: unknown;
}
