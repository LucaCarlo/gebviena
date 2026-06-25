import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthProfessional } from "@/lib/professional-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pro = await getAuthProfessional();
  if (!pro) return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });

  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 1), 200);
  // Lingua: prima la lingua attiva del sito (header x-gtv-lang impostato dal
  // middleware in base a path/cookie/lang-switcher), poi query string,
  // fallback alla lingua del profilo, infine "it".
  const qLang = (req.nextUrl.searchParams.get("lang") || "").toLowerCase();
  const headerLang = (req.headers.get("x-gtv-lang") || "").toLowerCase();
  const profileLang = ((pro as { language?: string | null }).language || "").toLowerCase();
  const VALID = ["it", "en", "de", "fr", "es"];
  const lang =
    (VALID.includes(qLang) && qLang) ||
    (VALID.includes(headerLang) && headerLang) ||
    (VALID.includes(profileLang) && profileLang) ||
    "it";

  // Notifiche per questo professionista + eventuale traduzione nella sua
  // lingua (fallback su IT se la traduzione non esiste o lang === 'it').
  const items = await prisma.professionalNotification.findMany({
    where: { OR: [{ audience: null }, { audience: pro.role }] },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: lang !== "it"
      ? { translations: { where: { languageCode: lang }, take: 1 } }
      : undefined,
  });

  const reads = items.length
    ? await prisma.professionalNotificationRead.findMany({
        where: { professionalId: pro.id, notificationId: { in: items.map((n) => n.id) } },
        select: { notificationId: true, readAt: true },
      })
    : [];
  const readMap = new Map(reads.map((r) => [r.notificationId, r.readAt]));

  const data = items.map((n) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tr = (n as any).translations?.[0];
    return {
      ...n,
      title: tr?.title || n.title,
      body: tr?.body ?? n.body,
      // Link: usa la versione tradotta se presente, altrimenti fallback al
      // link del master (impostato dall'admin in lingua sorgente).
      link: tr?.link ?? n.link,
      isRead: readMap.has(n.id),
      readAt: readMap.get(n.id) || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      translations: undefined as any,
    };
  });
  const unreadCount = data.filter((n) => !n.isRead).length;

  return NextResponse.json({ success: true, data: { items: data, unreadCount } });
}
