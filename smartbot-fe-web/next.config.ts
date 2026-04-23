import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/bots/:id/config",
        destination: "/bots/:id/settings",
        permanent: false,
      },
      {
        source: "/bots/:id/personality",
        destination: "/bots/:id/flow",
        permanent: false,
      },
      {
        source: "/bots/:id/widget",
        destination: "/bots/:id/integrations?section=widget",
        permanent: false,
      },
      {
        source: "/bots/:id/api-embed",
        destination: "/bots/:id/integrations?section=api",
        permanent: false,
      },
      {
        source: "/bots/:id/channels",
        destination: "/bots/:id/integrations?section=channels",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
