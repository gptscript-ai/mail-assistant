import React, { ReactNode } from 'react';

// material-ui
import Box from '@mui/material/Box';

// project import
import MainCard from '../card/MainCard';

// Define the props interface
interface AuthCardProps {
    children: ReactNode;
    [key: string]: any; // This allows for any additional props
}

// ==============================|| AUTHENTICATION - CARD WRAPPER ||============================== //

export default function AuthCard({ children, ...other }: AuthCardProps) {
    return (
        <MainCard
            sx={{
                maxWidth: { xs: 400, lg: 475 },
                margin: { xs: 2.5, md: 3 },
                '& > *': { flexGrow: 1, flexBasis: '50%' },
            }}
            content={false}
            {...other}
            border={false}
            boxShadow
            shadow={(theme: any) => theme.customShadows.z1}
        >
            <Box sx={{ p: { xs: 2, sm: 3, md: 4, xl: 5 } }}>{children}</Box>
        </MainCard>
    );
}
