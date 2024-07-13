/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    async redirects() {
        return [
            {
                source: '/',
                destination: '/tasks',
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
