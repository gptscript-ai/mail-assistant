import type { NavItemConfig } from '@/types/nav';

export const navItems = [
    {
        key: 'tasks',
        title: 'Tasks',
        href: '/tasks',
        icon: 'task',
    },
    {
        key: 'contexts',
        title: 'Rule Sets',
        href: '/contexts',
        icon: 'context',
    },
] satisfies NavItemConfig[];

export const bottomNavItems = [
    {
        key: 'account',
        title: 'Account',
        icon: 'account',
        href: '/account',
    },
    {
        key: 'spam',
        title: 'Cold Email',
        icon: 'spam',
        href: '/spam',
    },
    {
        key: 'signout',
        title: 'Sign Out',
        icon: 'signout',
        href: '/signout',
    },
] satisfies NavItemConfig[];
