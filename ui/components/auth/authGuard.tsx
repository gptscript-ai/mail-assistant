'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { getUser } from '@/utils/getUser';

export interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({
    children,
}: AuthGuardProps): React.JSX.Element | null {
    const router = useRouter();
    const [isChecking, setIsChecking] = React.useState<boolean>(true);

    React.useEffect(() => {
        const checkAuthenticated = async (): Promise<void> => {
            try {
                await getUser();
            } catch (error) {
                console.log(
                    '[AuthGuard]: User is not logged in, redirecting to sign in'
                );
                router.push('/signin');
                return;
            }

            setIsChecking(false);
        };
        checkAuthenticated().catch(() => {});
    }, [router]);

    if (isChecking) {
        return null;
    }

    return <React.Fragment>{children}</React.Fragment>;
}
