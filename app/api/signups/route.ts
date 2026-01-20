import { SignupStatus } from "@prisma/client";
import { z } from "zod";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as signupService from "@/app/api/_lib/services/signup.service";

const signupSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
});

const sanitizeSignupEvent = <T extends { event?: unknown }>(signup: T) => {
  if (!signup.event || typeof signup.event !== "object") return signup;
  const { checkInToken, ...event } = signup.event as Record<string, unknown>;
  return {
    ...signup,
    event,
  };
};

export async function POST(req: Request) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    const body = await req.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return jsonError(400, validation.error.errors[0].message);
    }

    const signup = await signupService.createSignup({
      userId: context!.user.id,
      eventId: validation.data.eventId,
    });

    const sanitizedSignup = sanitizeSignupEvent(signup);
    const statusMessage =
      signup.status === SignupStatus.PENDING
        ? "Signup submitted and pending approval"
        : signup.status === SignupStatus.WAITLISTED
        ? "Added to the waitlist"
        : "Successfully signed up for event";

    return Response.json({
      success: true,
      data: { signup: sanitizedSignup },
      message: statusMessage,
    });
  } catch (error) {
    console.error("Create signup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to sign up";
    return jsonError(400, errorMessage);
  }
}
