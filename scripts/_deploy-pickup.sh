#!/bin/bash
set -e
source ~/.nvm/nvm.sh 2>/dev/null || true
APP=~/htdocs/gebruederthonetvienna.com
cd "$APP"
cp /tmp/dp_schema.prisma       prisma/schema.prisma
cp /tmp/dp_addpickup.ts        scripts/_add-storepickup.ts
cp /tmp/dp_quote.ts            src/app/api/store/public/shipping/quote/route.ts
cp /tmp/dp_cpi.ts              src/app/api/store/public/checkout/create-payment-intent/route.ts
cp /tmp/dp_orderemail.ts       src/lib/order-email.ts
cp /tmp/dp_checkout.tsx        src/app/store/checkout/page.tsx
cp /tmp/dp_settings.tsx        src/app/admin/settings/page.tsx
cp /tmp/dp_registrants.tsx     src/components/admin/RegistrantsData.tsx
cp /tmp/dp_layout.tsx          src/app/layout.tsx
cp /tmp/dp_storesettings.tsx   src/app/admin/store/settings/page.tsx
cp /tmp/dp_productcard.tsx     src/components/store/ProductCard.tsx
cp /tmp/dp_prodpage.tsx        "src/app/store/prodotti/[slug]/page.tsx"
echo "FILES_COPIED"
npx tsx scripts/_add-storepickup.ts 2>&1 | tail -3
npx prisma generate 2>&1 | tail -1
npm run build 2>&1 | tail -5
echo "BUILD_DONE"
