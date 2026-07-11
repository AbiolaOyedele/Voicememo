import path from 'path'
import type { NextConfig } from 'next'

/**
 * Validate environment on server startup (skipped during the build phase, where
 * server-only secrets are intentionally absent).
 */
import './src/config/env'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the file-tracing root to this project. A stray lockfile in the home
  // directory otherwise makes Next infer the wrong workspace root.
  outputFileTracingRoot: path.join(__dirname),
  // PWA (next-pwa) is wired up in Build Order Step 10.
}

export default nextConfig
