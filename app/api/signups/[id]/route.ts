import { Role } from "@prisma/client";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as eventService from "@/app/api/_lib/services/event.service";
import * as signupService from "@/app/api/_lib/services/signup.service";
import * as userService from "@/app/api/_lib/services/user.service";

const sanitizeSignupEvent = <T extends { event?: unknown }>(signup: T) => {
  if (!signup.event || typeof signup.event !== "object") return signup;
  const { checkInToken, ...event } = signup.event as Record<string, unknown>;
  return {
    ...signup,
    event,
  };
};

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    const signup = await signupService.getSignupById(params.id);

    if (!signup) {
      return jsonError(404, "Signup not found");
    }

    const userId = context!.user.id;
    const isSelf = signup.userId === userId;
    const isAssistant = signup.signedUpById === userId;
    const isStaff = context?.dbUser?.role === Role.STAFF;
    const isCreator = await eventService.isEventCreator(signup.eventId, userId);
    const isLinkedCaregiver =
      context?.dbUser?.role === Role.CAREGIVER
        ? await userService.isCaregiverForStudent(userId, signup.userId)
        : false;

    if (!isSelf && !isAssistant && !isStaff && !isCreator && !isLinkedCaregiver) {
      return jsonError(403, "You do not have permission to view this signup");
    }

    return Response.json({
      success: true,
      data: { signup: sanitizeSignupEvent(signup) },
    });
  } catch (error) {
    console.error("Get signup error:", error);
    return jsonError(500, "Failed to get signup");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    await signupService.cancelSignup(params.id, context!.user.id);

    return Response.json({
      success: true,
      message: "Signup cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel signup error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to cancel signup";
    return jsonError(400, errorMessage);
  }
}
