import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rootPackageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8")
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@momentum/shared"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  env: {
    APP_VERSION: rootPackageJson.version,
  },
};

export default nextConfig;
