import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { sendBulkNewsletterEmails } from "@/lib/newsletter-sender";

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = await sendBulkNewsletterEmails({
      subscriberIds: body.subscriberIds,
      templateId: body.templateId,
      landingPageId: body.landingPageId,
      subject: body.subject,
      html: body.html,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: { sent: result.sent, failed: result.failed, total: result.total },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
