import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { ChatCircleDots } from '@phosphor-icons/react/dist/ssr/ChatCircleDots';
import { Note } from '@phosphor-icons/react/dist/ssr/Note';
import { SignOut } from '@phosphor-icons/react/dist/ssr/SignOut';
import { UserCircle } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { Mailbox } from '@phosphor-icons/react/dist/ssr/Mailbox';

export const navIcons = {
    task: ChatCircleDots,
    context: Note,
    signout: SignOut,
    account: UserCircle,
    spam: Mailbox,
} as Record<string, Icon>;
