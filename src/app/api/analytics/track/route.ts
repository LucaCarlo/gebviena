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

// User-Agent noti-hostile: client HTTP grezzi (script/bot) e bot dichiarati.
// I browser reali mandano SEMPRE uno UA lungo tipo "Mozilla/5.0 (...)".
// Solo bot mandano UA vuoto o uno dei prefissi qui sotto.
const BOT_UA_PREFIXES = [
  "Go-http-client",
  "python-requests",
  "python-urllib",
  "Python/",
  "Java/",
  "okhttp",
  "curl/",
  "Wget/",
  "libwww-perl",
  "Apache-HttpClient",
  "node-fetch",
];
const BOT_UA_SUBSTRINGS = [
  " bot",       // Googlebot, Bingbot, ecc. (con spazio per non matchare "robotic")
  "Bot/",
  "spider",
  "crawler",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "PetalBot",
  "SeznamBot",
  "Bytespider",
];

function isBotPath(path: string): boolean {
  if (!path) return true;
  return BOT_PATH_PATTERNS.some((r) => r.test(path));
}

function isBotUserAgent(ua: string | null | undefined): boolean {
  const s = (ua || "").trim();
  // UA vuoto o singolo "-" -> quasi sicuramente bot (browser reali mandano sempre uno UA lungo)
  // Browser reali mandano UA >=80 caratteri (es. "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/xxx").
  // Sotto ai 30 chars è quasi certamente uno script/bot con UA sintetico.
  if (!s || s === "-" || s.length < 30) return true;
  // Prefisso noto (case-insensitive)
  const lower = s.toLowerCase();
  if (BOT_UA_PREFIXES.some((p) => lower.startsWith(p.toLowerCase()))) return true;
  if (BOT_UA_SUBSTRINGS.some((sub) => lower.includes(sub.toLowerCase()))) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { path: pagePath, referrer, userAgent } = body;

    if (!pagePath) {
      return NextResponse.json({ success: false, error: "Path richiesto" }, { status: 400 });
    }

    // Silenziosamente scartati (204): il bot non capisce che è filtrato.
    if (isBotPath(pagePath) || isBotUserAgent(userAgent)) {
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
