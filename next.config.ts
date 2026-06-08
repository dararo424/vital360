import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // La foto (base64) viaja a la Server Action analyzeMealPhoto.
      // La downscalamos en el cliente, pero damos margen.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
