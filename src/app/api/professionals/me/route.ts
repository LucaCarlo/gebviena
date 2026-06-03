import { NextResponse } from "next/server";
import { getAuthProfessional } from "@/lib/professional-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const pro = await getAuthProfessional();
  if (!pro) return NextResponse.json({ success: false, professional: null });
  return NextResponse.json({ success: true, professional: pro });
}
