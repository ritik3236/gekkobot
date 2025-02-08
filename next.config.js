/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'ca.slack-edge.com',
                port: '',
                pathname: '/**',
            },{
                protocol: 'https',
                hostname: 'pbs.twimg.com',
                port: '',
                pathname: '/profile_images/**',
            },
            {
                protocol: 'https',
                hostname: 'cdn.rareblocks.xyz',
                port: '',
                pathname: '/collection/celebration/images/**',
            },
            {
                protocol: 'https',
                hostname: 'nextui.org',
                port: '',
                pathname: '/images/**',
            },
        ],
    },
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
}

const withBundleAnalyzer =  require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig);
