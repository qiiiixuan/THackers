import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import { normalizeQrToken } from "@/app/api/_lib/qr";
import * as eventService from "@/app/api/_lib/services/event.service";
import * as signupService from "@/app/api/_lib/services/signup.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    const { token } = await params;
    const normalizedToken = normalizeQrToken(token);
    const event = await eventService.getEventByCheckInToken(normalizedToken);

    if (!event) {
      return jsonError(404, "Event not found");
    }

    const signup = await signupService.checkInByEventToken(
      event.id,
      context!.user.id
    );

    return Response.json({
      success: true,
      data: { signup, eventId: event.id },
      message: "Checked in successfully",
    });
  } catch (error) {
    console.error("QR check-in error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to check in";
    return jsonError(400, errorMessage);
  }
}
