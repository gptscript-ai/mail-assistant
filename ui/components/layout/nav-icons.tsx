import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { ChatCircleDots } from '@phosphor-icons/react/dist/ssr/ChatCircleDots';
import { Note } from '@phosphor-icons/react/dist/ssr/Note';

export const navIcons = {
    task: ChatCircleDots,
    context: Note,
} as Record<string, Icon>;
