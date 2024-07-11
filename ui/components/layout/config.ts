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
        title: 'Contexts',
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
        key: 'signout',
        title: 'Sign Out',
        icon: 'signout',
    },
] satisfies NavItemConfig[];
