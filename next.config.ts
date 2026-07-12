import path from 'path'
import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

// Server env is validated at boot via src/instrumentation.ts (register hook).

// Commit SHA of this build (Vercel sets VERCEL_GIT_COMMIT_SHA). Inlined into
// the client bundle so a running tab can detect when a newer deploy is live —
// see src/hooks/useUpdatePrompt.ts.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || 'dev'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the file-tracing root to this project. A stray lockfile in the home
  // directory otherwise makes Next infer the wrong workspace root.
  outputFileTracingRoot: path.join(__dirname),
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
}

// PWA via Serwist (maintained successor to next-pwa). Disabled in dev to avoid
// stale service-worker caching during development.
const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: true,
})

export default withSerwist(nextConfig)
