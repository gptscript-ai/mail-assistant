'use client';

import React from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

// assets
import Image from 'next/image';
import AuthWrapper from '@/components/auth/AuthWrapper';
import ThemeCustomization from '@/themes';

const Page = () => {
    const handleSignIn = () => {
        window.location.href = '/api/login';
    };

    return (
        <ThemeCustomization>
            <AuthWrapper>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Stack
                            direction="row"
                            justifyContent="center"
                            alignItems="center"
                            sx={{ mb: { xs: -0.5, sm: 0.5 } }}
                        >
                            <Typography variant="h3">Login</Typography>
                        </Stack>
                    </Grid>
                    <Grid item xs={12}>
                        <Divider>
                            <Typography variant="caption">
                                {' '}
                                Login with
                            </Typography>
                        </Divider>
                    </Grid>
                    <Grid item xs={12}>
                        <Stack
                            direction="column"
                            spacing={{ xs: 1, sm: 2 }}
                            justifyContent={{
                                xs: 'space-around',
                                sm: 'space-between',
                            }}
                            sx={{
                                '& .MuiButton-startIcon': {
                                    mr: { xs: 0, sm: 1 },
                                    ml: { xs: 0, sm: -0.5 },
                                },
                            }}
                        >
                            <Button
                                variant="outlined"
                                color="secondary"
                                startIcon={
                                    <Image
                                        src="./microsoft.svg"
                                        width={25}
                                        height={25}
                                        alt="Microsoft"
                                    />
                                }
                                onClick={handleSignIn}
                            >
                                {'Microsoft'}
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
            </AuthWrapper>
        </ThemeCustomization>
    );
};

export default Page;
