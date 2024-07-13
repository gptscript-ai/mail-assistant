import * as React from 'react';

import 'styles/global.css';

import { UserProvider } from '@/contexts/user-context';
import { LocalizationProvider } from '@/components/core/localization-provider';
import { ThemeProvider } from '@/components/core/theme-provider/theme-provider';
import Layout from '@/components/layout/layout';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <LocalizationProvider>
                    <UserProvider>
                        <ThemeProvider>
                            <Layout>{children}</Layout>
                        </ThemeProvider>
                    </UserProvider>
                </LocalizationProvider>
            </body>
        </html>
    );
}
