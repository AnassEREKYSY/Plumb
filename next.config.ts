import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  // The PDF renderer runs in Node and reads its fonts from disk.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/api/export/pdf": ["./src/assets/fonts/**"],
  },
};

export default nextConfig;
