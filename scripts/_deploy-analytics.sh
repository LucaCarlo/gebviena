#!/bin/bash
set -e
source ~/.nvm/nvm.sh
APP=~/htdocs/gebruederthonetvienna.com
cd "$APP"
cp /tmp/a_route.ts src/app/api/analytics/route.ts
cp /tmp/a_page.tsx src/app/admin/analytics/page.tsx
cp /tmp/a_layout.tsx src/app/layout.tsx
cp /tmp/a_schema.prisma prisma/schema.prisma
cp /tmp/_set-gtm.ts scripts/
echo "file ok"
npx tsx scripts/_set-gtm.ts 2>&1 | tail -1
rm -f scripts/_set-gtm.ts
npx prisma generate 2>&1 | tail -1
npm run build 2>&1 | tail -3
echo "--- geo background progress ---"
tail -3 /tmp/geo-traffic.log 2>/dev/null || echo "(log non leggibile)"
