import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // fișierele Excel exportate de script au ~200 KB; lăsăm loc pentru liste mai mari
      bodySizeLimit: "10mb",
    },
  },
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
