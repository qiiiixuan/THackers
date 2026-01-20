import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as eventService from "@/app/api/_lib/services/event.service";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    const isCreator = await eventService.isEventCreator(params.id, context!.user.id);

    if (!isCreator) {
      return jsonError(
        403,
        "Only the event creator can regenerate the check-in QR token"
      );
    }

    const newToken = await eventService.regenerateEventCheckInToken(params.id);

    return Response.json({
      success: true,
      data: { checkInToken: newToken },
      message: "Check-in QR token regenerated successfully",
    });
  } catch (error) {
    console.error("Regenerate event check-in QR error:", error);
    return jsonError(500, "Failed to regenerate check-in QR token");
  }
}
