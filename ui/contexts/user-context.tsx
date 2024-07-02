'use client';

import type { User } from '@/types/user';
import { createContext, useCallback, useEffect, useState } from 'react';
import { getUser } from '@/utils/getUser';

export interface UserContextValue {
    user: User | null;
    error: string | null;
    isLoading: boolean;
    checkSession?: () => Promise<void>;
}

export const UserContext = createContext<UserContextValue | undefined>(
    undefined
);

export interface UserProviderProps {
    children: React.ReactNode;
}

export function UserProvider({
    children,
}: UserProviderProps): React.JSX.Element {
    const [state, setState] = useState<{
        user: User | null;
        error: string | null;
        isLoading: boolean;
    }>({
        user: null,
        error: null,
        isLoading: true,
    });

    const checkSession = useCallback(async (): Promise<void> => {
        try {
            const user = await getUser();

            setState((prev) => ({
                ...prev,
                user: user ?? null,
                error: null,
                isLoading: false,
            }));
        } catch (err) {
            setState((prev) => ({
                ...prev,
                user: null,
                error: 'Something went wrong',
                isLoading: false,
            }));
        }
    }, []);

    useEffect(() => {
        checkSession().catch((err: unknown) => {
            console.error(err);
            // noop
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected
    }, []);

    return (
        <UserContext.Provider value={{ ...state, checkSession }}>
            {children}
        </UserContext.Provider>
    );
}

export const UserConsumer = UserContext.Consumer;
