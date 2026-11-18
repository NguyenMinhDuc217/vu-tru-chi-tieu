#!/usr/bin/env bash
# Builds the deployable page public/index.html from the app source thap-chi-tieu.html.
# The other files in public/ (manifest, service worker, icons, _headers) are kept in git as they are.
# thap-chi-tieu.html is written as a page body (the format claude.ai Artifacts use);
# this wraps it in a full HTML document for static hosting (Cloudflare Pages, etc.).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p public
{
  printf '%s\n' '<!doctype html>' \
    '<html lang="vi"><head><meta charset="utf-8">' \
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' \
    '<meta name="description" content="Vũ Trụ Chi Tiêu: quản lý chi tiêu hàng tháng bằng một hệ hành tinh 3D.">' \
    '<meta name="theme-color" content="#04030D">' \
    '<link rel="manifest" href="/manifest.webmanifest">' \
    '<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">' \
    '<link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png">' \
    '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">' \
    '<meta name="mobile-web-app-capable" content="yes">' \
    '<meta name="apple-mobile-web-app-capable" content="yes">' \
    '<meta name="apple-mobile-web-app-title" content="Chi Tiêu">' \
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">' \
    '<style>body{margin:0}[hidden]{display:none!important}</style>'
  # Firebase (sign-in + cloud sync) is only part of the public build, not the claude.ai artifact.
  printf '%s\n' \
    '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>' \
    '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>' \
    '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>' \
    "<script>if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(e => console.warn('sw', e)));</script>" \
    '<script>'
  cat firebase-config.js
  printf '%s\n' '</script></head><body>'
  cat thap-chi-tieu.html
  printf '\n%s\n' '</body></html>'
} > public/index.html
echo "Built public/index.html"
