import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE_NAME } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(CUSTOMER_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
