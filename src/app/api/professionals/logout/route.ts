import { NextResponse } from "next/server";
import { PROFESSIONAL_COOKIE_NAME } from "@/lib/professional-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ success: true });
  // Cancella cookie sessione (maxAge=0).
  res.cookies.set(PROFESSIONAL_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
