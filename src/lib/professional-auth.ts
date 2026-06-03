import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Sessione del professionista loggato sul sito pubblico. Riusa lo stesso
// approccio dei clienti store (JWT in cookie httpOnly, 60 giorni).
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const COOKIE_NAME = "professional_token";

export interface ProfessionalJWTPayload {
  professionalId: string;
  email: string;
  role: string;
}

export function signProfessionalToken(payload: ProfessionalJWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "60d" });
}

export function verifyProfessionalToken(token: string): ProfessionalJWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as ProfessionalJWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthProfessional() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyProfessionalToken(token);
  if (!payload) return null;
  const pro = await prisma.professional.findUnique({
    where: { id: payload.professionalId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      company: true,
      role: true,
      language: true,
      isActive: true,
    },
  });
  // Se l'admin ha disattivato l'account, lo trattiamo come non loggato.
  if (!pro || !pro.isActive) return null;
  return pro;
}

export const PROFESSIONAL_COOKIE_NAME = COOKIE_NAME;

export function professionalCookieOptions() {
  const isSecure = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https") ?? false;
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 60, // 60 giorni
    path: "/",
  };
}
