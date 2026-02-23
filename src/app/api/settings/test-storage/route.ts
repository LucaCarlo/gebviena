import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { checkS3Connection, isS3Configured } from "@/lib/s3";

export async function POST() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    if (!isS3Configured()) {
      return NextResponse.json({
        success: false,
        error: "Wasabi S3 non configurato. Assicurati che le variabili WASABI_ACCESS_KEY, WASABI_SECRET_KEY e WASABI_BUCKET siano impostate nel file .env",
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
