import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Uploads can be large; allow generous body size for server actions / route handlers.
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  // En-têtes de sécurité appliqués à toutes les réponses.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Anti-clickjacking : embarquable uniquement par l'application
          // elle-même (l'aperçu de fichiers utilise des iframes same-origin).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          // Empêche le navigateur de « deviner » un type MIME (anti-sniffing).
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          // Force HTTPS pendant 2 ans (préchargement inclus).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
