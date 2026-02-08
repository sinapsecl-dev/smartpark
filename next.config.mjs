import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    cacheOnNavigation: true,
    reloadOnOnline: true,
    disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode for better development practices
    reactStrictMode: true,

    // Optimize images
    images: {
        formats: ["image/avif", "image/webp"],
        deviceSizes: [640, 750, 828, 1080, 1200],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
    },

    // Enable experimental features for better performance
    experimental: {
        optimizePackageImports: ["lucide-react", "framer-motion", "@dicebear/core"],
        serverComponentsExternalPackages: ["web-push"],
    },
};

export default withSerwist(nextConfig);
