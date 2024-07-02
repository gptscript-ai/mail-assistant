import { User } from '@/types/user';

export async function getUser(): Promise<User> {
    const response = await fetch('/api/me', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to create task');
    }

    const data = await response.json();
    const fullName = data.Name as string;
    const firstName = fullName.split(' ', 2)[0];
    const lastName = fullName.split(' ', 2)[1];
    return {
        id: data.ID,
        name: data.Name,
        avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}`,
        email: data.Email,
    };
}
