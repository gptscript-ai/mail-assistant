'use client';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import React, { useEffect } from 'react';
import Box from '@mui/material/Box';
import RouterLink from 'next/link';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { useRouter } from 'next/navigation';

const Page = () => {
    const router = useRouter();
    useEffect(() => {
        document.cookie = `jwt-token=; Max-Age=0; path=/; domain=${window.location.hostname}; expires=${new Date(0).toUTCString()};`;
    }, []);

    return (
        <Box
            component="main"
            sx={{
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'center',
                minHeight: '100%',
            }}
        >
            <Stack spacing={3} sx={{ alignItems: 'center', maxWidth: 'md' }}>
                <Typography variant="h3" sx={{ textAlign: 'center' }}>
                    You have signed out.
                </Typography>
                <Button
                    component={RouterLink}
                    href="/"
                    startIcon={
                        <ArrowLeftIcon fontSize="var(--icon-fontSize-md)" />
                    }
                    variant="contained"
                >
                    Go back to home
                </Button>
            </Stack>
        </Box>
    );
};

export default Page;
