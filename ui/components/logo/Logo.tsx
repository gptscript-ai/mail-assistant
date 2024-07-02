import React from 'react';

// material-ui
import { ButtonBase } from '@mui/material';
import Stack from '@mui/material/Stack';
import Image from 'next/image';

// Define the props interface
interface LogoSectionProps {
    sx?: object;
    to?: string;
}

// ==============================|| MAIN LOGO ||============================== //

const LogoSection: React.FC<LogoSectionProps> = ({ sx, to }) => {
    return (
        <ButtonBase disableRipple sx={sx}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Image src="/logo.png" height="50" alt="copilot" width="50" />
            </Stack>
        </ButtonBase>
    );
};

export default LogoSection;
