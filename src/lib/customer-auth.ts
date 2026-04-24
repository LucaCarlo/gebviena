import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const COOKIE_NAME = "customer_token";

export interface CustomerJWTPayload {
  customerId: string;
  email: string;
}

export function signCustomerToken(payload: CustomerJWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyCustomerToken(token: string): CustomerJWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as CustomerJWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthCustomer() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyCustomerToken(token);
  if (!payload) return null;
  const customer = await prisma.customer.findUnique({
    where: { id: payload.customerId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      language: true,
      marketingOptIn: true,
      isActive: true,
    },
  });
  if (!customer || !customer.isActive) return null;
  return customer;
}

export const CUSTOMER_COOKIE_NAME = COOKIE_NAME;

export function customerCookieOptions() {
  const isSecure = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https") ?? false;
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  };
}
