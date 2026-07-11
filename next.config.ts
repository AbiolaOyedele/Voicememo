import path from 'path'
import type { NextConfig } from 'next'

// Server env is validated at boot via src/instrumentation.ts (register hook).

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the file-tracing root to this project. A stray lockfile in the home
  // directory otherwise makes Next infer the wrong workspace root.
  outputFileTracingRoot: path.join(__dirname),
  // PWA (next-pwa) is wired up in Build Order Step 10.
}

export default nextConfig
