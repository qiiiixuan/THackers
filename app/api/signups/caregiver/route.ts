import { Role, SignupStatus } from "@prisma/client";
import { z } from "zod";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as signupService from "@/app/api/_lib/services/signup.service";

const caregiverSignupSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  studentId: z.string().uuid("Invalid student ID"),
});

const isEventManagerRole = (role?: Role) =>
  role === Role.CAREGIVER || role === Role.STAFF;

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

    if (!isEventManagerRole(context?.dbUser?.role)) {
      return jsonError(403, "Only caregivers or staff can sign up students");
    }

    const body = await req.json();
    const validation = caregiverSignupSchema.safeParse(body);

    if (!validation.success) {
      return jsonError(400, validation.error.errors[0].message);
    }

    const signup = await signupService.caregiverSignup(
      validation.data.studentId,
      validation.data.eventId,
      context!.user.id
    );

    const sanitizedSignup = sanitizeSignupEvent(signup);
    const statusMessage =
      signup.status === SignupStatus.PENDING
        ? "Student signup submitted and pending approval"
        : signup.status === SignupStatus.WAITLISTED
        ? "Student added to the waitlist"
        : "Student successfully signed up for event";

    return Response.json({
      success: true,
      data: { signup: sanitizedSignup },
      message: statusMessage,
    });
  } catch (error) {
    console.error("Caregiver signup error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to sign up student";
    return jsonError(400, errorMessage);
  }
}
