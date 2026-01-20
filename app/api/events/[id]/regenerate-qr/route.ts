import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as eventService from "@/app/api/_lib/services/event.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    const isCreator = await eventService.isEventCreator(id, context!.user.id);

    if (!isCreator) {
      return jsonError(403, "Only the event creator can regenerate the QR token");
    }

    const newToken = await eventService.regenerateEventQrToken(id);

    return Response.json({
      success: true,
      data: { qrToken: newToken },
      message: "QR token regenerated successfully",
    });
  } catch (error) {
    console.error("Regenerate event QR error:", error);
    return jsonError(500, "Failed to regenerate QR token");
  }
}
