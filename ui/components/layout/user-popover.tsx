import * as React from 'react';
import RouterLink from 'next/link';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { SignOut as SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { User } from '@/types/user';

export interface UserPopoverProps {
    anchorEl: Element | null;
    onClose: () => void;
    open: boolean;
    user: User | null;
}

export function UserPopover({
    anchorEl,
    onClose,
    open,
    user,
}: UserPopoverProps): React.JSX.Element {
    const router = useRouter();

    const handleSignOut = React.useCallback(async (): Promise<void> => {
        document.cookie = `jwt-token=; Max-Age=0; path=/; domain=${window.location.hostname}; expires=${new Date(0).toUTCString()};`;
        router.push('/signout');
    }, [router]);

    return (
        <Popover
            anchorEl={anchorEl}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            onClose={onClose}
            open={open}
            slotProps={{ paper: { sx: { width: '240px' } } }}
        >
            <Box sx={{ p: '16px 20px ' }}>
                <Typography variant="subtitle1">{user?.name}</Typography>
                <Typography color="text.secondary" variant="body2">
                    {user?.email}
                </Typography>
            </Box>
            <Divider />
            <MenuList
                disablePadding
                sx={{ p: '8px', '& .MuiMenuItem-root': { borderRadius: 1 } }}
            >
                <MenuItem onClick={handleSignOut}>
                    <ListItemIcon>
                        <SignOutIcon fontSize="var(--icon-fontSize-md)" />
                    </ListItemIcon>
                    Sign out
                </MenuItem>
            </MenuList>
        </Popover>
    );
}
