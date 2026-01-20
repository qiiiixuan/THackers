import { SignupStatus } from "@prisma/client";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import { normalizeQrToken } from "@/app/api/_lib/qr";
import * as eventService from "@/app/api/_lib/services/event.service";
import * as signupService from "@/app/api/_lib/services/signup.service";

const sanitizeSignupEvent = <T extends { event?: unknown }>(signup: T) => {
  if (!signup.event || typeof signup.event !== "object") return signup;
  const { checkInToken, ...event } = signup.event as Record<string, unknown>;
  return {
    ...signup,
    event,
  };
};

const sanitizeEvent = (event: Record<string, unknown>) => {
  const { checkInToken, ...rest } = event;
  return rest;
};

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    const normalizedToken = normalizeQrToken(params.token);
    const event = await eventService.getEventByQrToken(normalizedToken);

    if (!event) {
      return jsonError(404, "Event not found");
    }

    const signup = await signupService.createSignup({
      userId: context!.user.id,
      eventId: event.id,
    });

    const sanitizedSignup = sanitizeSignupEvent(signup);
    const statusMessage =
      signup.status === SignupStatus.PENDING
        ? `Signup pending approval for "${event.title}"`
        : signup.status === SignupStatus.WAITLISTED
        ? `Added to the waitlist for "${event.title}"`
        : `Successfully signed up for "${event.title}"`;

    return Response.json({
      success: true,
      data: { signup: sanitizedSignup, event: sanitizeEvent(event as Record<string, unknown>) },
      message: statusMessage,
    });
  } catch (error) {
    console.error("QR signup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to sign up";
    return jsonError(400, errorMessage);
  }
}
