import { NextResponse } from "next/server";
import { getAuthCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getAuthCustomer();
  if (!customer) {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ success: true, authenticated: true, data: customer });
}
