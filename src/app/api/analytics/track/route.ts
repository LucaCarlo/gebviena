import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Path noti-hostile: scanner di vulnerabilità che cercano file di config,
// backup, admin panel, exploit vari. Bloccati dal tracking analytics per non
// gonfiare i numeri (né inquinare i "top page").
const BOT_PATH_PATTERNS: RegExp[] = [
  /^\/\.env/i,                                  // /.env, /.env.local, ecc.
  /^\/\.git/i,                                  // /.git/config
  /\.(tar|tgz|zip|gz|rar|7z|sql|bak|old|swp)$/i, // backup/dump
  /\.(php|asp|aspx|cgi|jsp)$/i,                 // stack diversi
  /^\/(wp-|xmlrpc|wordpress|joomla|drupal|phpmyadmin|phpMyAdmin|pma)/i,
  /^\/(cgi-bin|adminer|admin\.php|shell\.php)/i,
  /^\/(actuator|api\/v1\/actuator|console|jmx-console)/i,
  /^\/vendor\/phpunit/i,
  /^\/(bitrix|autodiscover|owa|ecp)/i,
  /^\/(wallet\.dat|config\.json|credentials|secrets)/i,
];

function isBotPath(path: string): boolean {
  if (!path) return true;
  return BOT_PATH_PATTERNS.some((r) => r.test(path));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { path: pagePath, referrer, userAgent } = body;

    if (!pagePath) {
      return NextResponse.json({ success: false, error: "Path richiesto" }, { status: 400 });
    }

    // Silenziosamente scartati: rispondiamo 204 senza inserire in DB.
    // Non serve rivelare al bot che il filtro esiste (200/204 va bene lo stesso).
    if (isBotPath(pagePath)) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await prisma.pageView.create({
      data: {
        path: pagePath,
        referrer: referrer || null,
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
