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
