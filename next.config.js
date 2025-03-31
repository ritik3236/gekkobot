/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    serverExternalPackages: ['tesseract.js'],
    outputFileTracingIncludes: {
        '/api/**/*': ['./node_modules/**/*.wasm', './node_modules/**/*.proto']
    }
}

module.exports = nextConfig;
