import Box from '@mui/material/Box';

// ==============================|| AUTH BLUR BACK SVG ||============================== //

export default function AuthBackground() {
    return (
        <Box
            sx={{
                position: 'absolute',
                filter: 'blur(18px)',
                zIndex: -1,
                bottom: 0,
                width: '100%',
                height: '100%',
                transform: 'inherit',
            }}
        >
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f0f8ff" />
            </svg>
        </Box>
    );
}
