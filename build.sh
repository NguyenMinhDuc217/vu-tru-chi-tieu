#!/usr/bin/env bash
# Builds the deployable page public/index.html from the app source thap-chi-tieu.html.
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
    '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 64 64%27%3E%3Ccircle cx=%2732%27 cy=%2732%27 r=%2714%27 fill=%27%23FFC861%27/%3E%3Cellipse cx=%2732%27 cy=%2732%27 rx=%2728%27 ry=%279%27 fill=%27none%27 stroke=%27%23B6A6FF%27 stroke-width=%273%27 transform=%27rotate(-20 32 32)%27/%3E%3C/svg%3E">' \
    '<style>body{margin:0}[hidden]{display:none!important}</style></head><body>'
  cat thap-chi-tieu.html
  printf '\n%s\n' '</body></html>'
} > public/index.html
echo "Built public/index.html"
