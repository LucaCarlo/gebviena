/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.wasabisys.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        // Old /uploads/... URLs -> serve via API route
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
  async redirects() {
    return [
      { source: "/news-e-rassegna-stampa", destination: "/news", permanent: true },
      { source: "/news-e-rassegna-stampa/:slug", destination: "/news/:slug", permanent: true },
      { source: "/campagne-e-video", destination: "/campaigns", permanent: true },
      { source: "/campagne-e-video/:slug", destination: "/campaigns/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
