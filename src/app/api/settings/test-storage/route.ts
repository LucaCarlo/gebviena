import { NextResponse } from "next/server";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { checkS3Connection, isS3Configured, invalidateS3Cache } from "@/lib/s3";

export async function POST() {
  const result = await requirePermission("settings", "edit");
  if (isErrorResponse(result)) return result;

  try {
    // Force fresh config read
    invalidateS3Cache();

    if (!(await isS3Configured())) {
      return NextResponse.json({
        success: false,
        error: "Wasabi S3 non configurato. Inserisci Access Key, Secret Key e Bucket nelle impostazioni Storage Cloud.",
      }, { status: 400 });
    }

    const connected = await checkS3Connection();

    if (connected) {
      return NextResponse.json({ success: true, data: { message: "Connessione a Wasabi S3 riuscita!" } });
    } else {
      return NextResponse.json({ success: false, error: "Connessione a Wasabi S3 fallita. Verifica le credenziali e il bucket." }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: `Errore: ${String(e)}` }, { status: 500 });
  }
}
