import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard-cache";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }
  const data = await getDashboardStats();
  return NextResponse.json({ success: true, data });
}
