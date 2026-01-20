import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as signupService from "@/app/api/_lib/services/signup.service";

const sanitizeSignupEvent = <T extends { event?: unknown }>(signup: T) => {
  if (!signup.event || typeof signup.event !== "object") return signup;
  const { checkInToken, ...event } = signup.event as Record<string, unknown>;
  return {
    ...signup,
    event,
  };
};

export async function GET(req: Request) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    const signups = await signupService.getUserSignups(context!.user.id);
    const sanitized = signups.map((signup) => sanitizeSignupEvent(signup));

    return Response.json({
      success: true,
      data: { signups: sanitized },
    });
  } catch (error) {
    console.error("Get my signups error:", error);
    return jsonError(500, "Failed to get signups");
  }
}
