import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import { normalizeQrToken } from "@/app/api/_lib/qr";
import * as eventService from "@/app/api/_lib/services/event.service";

const sanitizeEvent = (event: Record<string, unknown>) => {
  const { checkInToken, ...rest } = event;
  return rest;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { error } = await getAuthContext(req);
    if (error) {
      return jsonError(error.status, error.message);
    }

    const { token } = await params;
    const normalizedToken = normalizeQrToken(token);
    const event = await eventService.getEventByQrToken(normalizedToken);

    if (!event) {
      return jsonError(404, "Event not found");
    }

    return Response.json({
      success: true,
      data: { event: sanitizeEvent(event as Record<string, unknown>) },
    });
  } catch (error) {
    console.error("Get event by QR token error:", error);
    return jsonError(500, "Failed to get event");
  }
}
