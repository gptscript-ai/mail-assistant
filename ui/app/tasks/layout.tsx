import * as React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import GlobalStyles from '@mui/material/GlobalStyles';

import { AuthGuard } from '@/components/auth/authGuard';
import { MainNav } from '@/components/layout/main-nav';
import { SideNav } from '@/components/layout/side-nav';
import ThemeCustomization from '@/themes';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps): React.JSX.Element {
    return (
        <AuthGuard>
            <GlobalStyles
                styles={{
                    body: {
                        '--MainNav-height': '56px',
                        '--MainNav-zIndex': 1000,
                        '--SideNav-width': '280px',
                        '--SideNav-zIndex': 1100,
                        '--MobileNav-width': '320px',
                        '--MobileNav-zIndex': 1100,
                    },
                }}
            />
            <Box
                sx={{
                    bgcolor: 'var(--mui-palette-background-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    height: '100%',
                }}
            >
                <SideNav />
                <Box
                    sx={{
                        display: 'flex',
                        flex: '1 1 auto',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        bottom: 0,
                        pl: { lg: 'var(--SideNav-width)' },
                    }}
                >
                    <MainNav />
                    <main>
                        <Container
                            maxWidth={false}
                            sx={{
                                pt: '64px',
                                pb: '16px',
                                width: '85%',
                                height: '95vh',
                                overflow: 'hidden',
                            }}
                        >
                            {children}
                        </Container>
                    </main>
                </Box>
            </Box>
        </AuthGuard>
    );
}
