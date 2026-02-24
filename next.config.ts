import type { NextConfig } from "next";

const supabaseHost = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .replace(/^https?:\/\//, '')
  .split('/')[0]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  async headers() {
    return [
      {
        // Apply to every route
        source: '/(.*)',
        headers: [
          // Clickjacking protection
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Limit referrer info sent cross-origin
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable unused browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Force HTTPS for 1 year (includeSubDomains, preload)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Content-Security-Policy
          // - script-src: 'unsafe-inline' + 'unsafe-eval' required by Next.js dev & hydration
          // - style-src: 'unsafe-inline' required by inline styles throughout the app
          // - img-src: blob/data for canvas exports; Supabase storage for thumbnails
          // - media-src: blob for <video> previews; Supabase for uploaded videos
          // - connect-src: Supabase REST + Realtime (wss)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: https://*.supabase.co https:`,
              `media-src 'self' blob: https://*.supabase.co`,
              `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${supabaseHost ? `https://${supabaseHost}` : ''}`,
              "font-src 'self'",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      {
        // API routes — also block framing and sniffing
        source: '/api/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent browsers caching API responses
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
};

export default nextConfig;
