import { NextResponse } from "next/server";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { checkS3Connection, isS3Configured, invalidateS3Cache, getActiveProvider } from "@/lib/s3";

export async function POST() {
  const result = await requirePermission("settings", "edit");
  if (isErrorResponse(result)) return result;

  try {
    invalidateS3Cache();
    const provider = await getActiveProvider();
    const label = provider === "vay" ? "VAY CDN" : "Wasabi";

    if (!(await isS3Configured())) {
      return NextResponse.json({
        success: false,
        error: `${label} non configurato. Verifica Access Key, Secret Key e Storage Zone/Bucket nelle impostazioni.`,
      }, { status: 400 });
    }

    const connected = await checkS3Connection();
    if (connected) {
      return NextResponse.json({ success: true, data: { message: `Connessione a ${label} riuscita!` } });
    } else {
      return NextResponse.json({
        success: false,
        error: `Connessione a ${label} fallita. Verifica le credenziali e la Storage Zone.`,
      }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: `Errore: ${String(e)}` }, { status: 500 });
  }
}
