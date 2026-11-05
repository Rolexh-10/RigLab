// UNVERIFIED (never run). The engine lives one level up in ../src/{core,data}; Next must be allowed to compile files outside web/.
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { externalDir: true },
  reactStrictMode: true
};
export default nextConfig;
