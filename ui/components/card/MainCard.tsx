import { forwardRef, ReactNode } from 'react';
import { SxProps, Theme, useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

// Define the props interface
interface MainCardProps {
    border?: boolean;
    boxShadow?: boolean;
    children?: ReactNode;
    content?: boolean;
    contentSX?: SxProps<Theme>;
    darkTitle?: boolean;
    elevation?: number;
    secondary?: ReactNode;
    shadow?: string;
    sx?: SxProps<Theme>;
    title?: ReactNode;

    [key: string]: any; // Allow additional properties
}

// Header style
const headerSX = {
    p: 2.5,
    '& .MuiCardHeader-action': { m: '0px auto', alignSelf: 'center' },
};

const MainCard = forwardRef<HTMLDivElement, MainCardProps>(
    (
        {
            border = true,
            boxShadow,
            children,
            content = true,
            contentSX = {},
            darkTitle,
            elevation,
            secondary,
            shadow,
            sx = {},
            title,
            ...others
        },
        ref
    ) => {
        const theme = useTheme();
        boxShadow =
            theme.palette.mode === 'dark' ? boxShadow || true : boxShadow;

        // @ts-ignore
        return (
            <Card
                elevation={elevation || 0}
                ref={ref}
                {...others}
                sx={{
                    border: border ? '1px solid' : 'none',
                    borderRadius: 2,
                    borderColor:
                        theme.palette.mode === 'dark'
                            ? theme.palette.divider
                            : theme.palette.grey['800'],
                    boxShadow:
                        boxShadow && (!border || theme.palette.mode === 'dark')
                            ? shadow
                            : 'inherit',
                    ':hover': {
                        boxShadow: boxShadow ? shadow : 'inherit',
                    },
                    '& pre': {
                        m: 0,
                        p: '16px !important',
                        fontFamily: theme.typography.fontFamily,
                        fontSize: '0.75rem',
                    },
                    ...sx,
                }}
            >
                {/* card header and action */}
                {!darkTitle && title && (
                    <CardHeader
                        sx={headerSX}
                        titleTypographyProps={{ variant: 'subtitle1' }}
                        title={title}
                        action={secondary}
                    />
                )}
                {darkTitle && title && (
                    <CardHeader
                        sx={headerSX}
                        title={<Typography variant="h3">{title}</Typography>}
                        action={secondary}
                    />
                )}

                {/* card content */}
                {content && (
                    <CardContent sx={contentSX}>{children}</CardContent>
                )}
                {!content && children}
            </Card>
        );
    }
);

MainCard.displayName = 'MainCard';

export default MainCard;
