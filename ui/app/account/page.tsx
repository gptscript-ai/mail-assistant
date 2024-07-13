'use client';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

import { User } from '@/types/user';
import { getUser } from '@/utils/getUser';
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { Alert, Snackbar, Switch } from '@mui/material';

const Account: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);

    useEffect(() => {
        getUser()
            .then((user) => {
                setUser(user);
                setSubscriptionEnabled(!user.subscriptionDisabled);
            })
            .catch();
    }, []);

    const handleToggleSubscription = async () => {
        const response = await fetch('/api/me', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subscriptionDisabled: subscriptionEnabled,
            }),
        });
        setSubscriptionEnabled(!subscriptionEnabled);
        setOpen(true);
    };

    const handleClose = (
        event: React.SyntheticEvent | Event,
        reason?: string
    ) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpen(false);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: '100vh',
                padding: 3,
            }}
        >
            <Stack spacing={3} sx={{ width: '100%', maxWidth: 1200 }}>
                <Grid
                    container
                    spacing={3}
                    sx={{
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Grid lg={8} md={12} xs={24}>
                        <Grid container sx={{ mb: '20px' }}>
                            <Typography variant="h4">Account</Typography>
                        </Grid>
                        <Card>
                            <CardContent>
                                <Stack
                                    spacing={2}
                                    sx={{ alignItems: 'center' }}
                                >
                                    <div>
                                        <Avatar
                                            src={user?.avatar}
                                            sx={{
                                                height: '80px',
                                                width: '80px',
                                            }}
                                        />
                                    </div>
                                    <Stack
                                        spacing={1}
                                        sx={{ textAlign: 'center' }}
                                    >
                                        <Typography variant="h5">
                                            {user?.name}
                                        </Typography>
                                        <Typography
                                            color="text.secondary"
                                            variant="body2"
                                        >
                                            {user?.email}
                                        </Typography>
                                        <Tooltip title="Disabling will stop watching all your messages from inbox">
                                            <Stack
                                                direction="row"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                width="100%"
                                            >
                                                <Typography variant="h6">
                                                    Subscription Enabled
                                                </Typography>
                                                <Switch
                                                    checked={
                                                        subscriptionEnabled
                                                    }
                                                    onChange={
                                                        handleToggleSubscription
                                                    }
                                                    color="primary"
                                                />
                                            </Stack>
                                        </Tooltip>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Stack>
            <Snackbar
                open={open}
                autoHideDuration={3000}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleClose}
                    severity="success"
                    sx={{ width: '100%' }}
                >
                    Saved successfully!
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Account;
