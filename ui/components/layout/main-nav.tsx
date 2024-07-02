'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { List as ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';

import { usePopover } from '@/hooks/use-popover';

import { MobileNav } from './mobile-nav';
import { UserPopover } from './user-popover';
import { User } from '@/types/user';
import { useEffect } from 'react';
import { getUser } from '@/utils/getUser';
import Notification from '@/components/notification/notification';
import ThemeCustomization from '@/themes';

export function MainNav(): React.JSX.Element {
    const [openNav, setOpenNav] = React.useState<boolean>(false);

    const userPopover = usePopover<HTMLDivElement>();

    const [user, setUser] = React.useState<User | null>(null);

    useEffect(() => {
        getUser()
            .then((user) => {
                setUser(user);
            })
            .catch();
    }, []);

    return (
        <React.Fragment>
            <ThemeCustomization>
                <Box
                    component="header"
                    sx={{
                        borderBottom: '1px solid var(--mui-palette-divider)',
                        backgroundColor: 'var(--mui-palette-background-paper)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 'var(--mui-zIndex-appBar)',
                    }}
                >
                    <Stack
                        direction="row"
                        spacing={2}
                        sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            minHeight: '64px',
                            px: 2,
                        }}
                    >
                        <Stack
                            sx={{ alignItems: 'center' }}
                            direction="row"
                            spacing={2}
                        >
                            <IconButton
                                onClick={(): void => {
                                    setOpenNav(true);
                                }}
                                sx={{ display: { lg: 'none' } }}
                            >
                                <ListIcon />
                            </IconButton>
                            <Tooltip title="Search">
                                <IconButton>
                                    <MagnifyingGlassIcon />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                        <Stack
                            sx={{ alignItems: 'center' }}
                            direction="row"
                            spacing={2}
                        >
                            <Notification />
                            <Avatar
                                onClick={userPopover.handleOpen}
                                ref={userPopover.anchorRef}
                                src={user?.avatar}
                                sx={{ cursor: 'pointer' }}
                            />
                        </Stack>
                    </Stack>
                </Box>
                <UserPopover
                    anchorEl={userPopover.anchorRef.current}
                    onClose={userPopover.handleClose}
                    open={userPopover.open}
                    user={user}
                />
                <MobileNav
                    onClose={() => {
                        setOpenNav(false);
                    }}
                    open={openNav}
                />
            </ThemeCustomization>
        </React.Fragment>
    );
}
