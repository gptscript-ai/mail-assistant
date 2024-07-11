import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { ChatCircleDots } from '@phosphor-icons/react/dist/ssr/ChatCircleDots';
import { Note } from '@phosphor-icons/react/dist/ssr/Note';
import { SignOut } from '@phosphor-icons/react/dist/ssr/SignOut';
import { UserCircle } from '@phosphor-icons/react/dist/ssr/UserCircle';

export const navIcons = {
    task: ChatCircleDots,
    context: Note,
    signout: SignOut,
    account: UserCircle,
} as Record<string, Icon>;
