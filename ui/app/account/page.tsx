'use client';
import * as React from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';

import { User } from '@/types/user';
import { getUser } from '@/utils/getUser';
import { useEffect } from 'react';

const Account: React.FC = () => {
    const [user, setUser] = React.useState<User | null>(null);

    useEffect(() => {
        getUser()
            .then((user) => {
                setUser(user);
            })
            .catch();
    }, []);
    return (
        <Stack spacing={3}>
            <div>
                <Typography variant="h4">Account</Typography>
            </div>
            <Grid container spacing={3}>
                <Grid lg={4} md={6} xs={12}>
                    <Card>
                        <CardContent>
                            <Stack spacing={2} sx={{ alignItems: 'center' }}>
                                <div>
                                    <Avatar
                                        src={user?.avatar}
                                        sx={{
                                            height: '80px',
                                            width: '80px',
                                        }}
                                    />
                                </div>
                                <Stack spacing={1} sx={{ textAlign: 'center' }}>
                                    <Typography variant="h5">
                                        {user?.name}
                                    </Typography>
                                    <Typography
                                        color="text.secondary"
                                        variant="body2"
                                    >
                                        {user?.email}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </CardContent>
                        <Divider />
                        <CardActions>
                            <Button fullWidth variant="text">
                                Upload picture
                            </Button>
                        </CardActions>
                    </Card>
                </Grid>
            </Grid>
        </Stack>
    );
};

export default Account;
