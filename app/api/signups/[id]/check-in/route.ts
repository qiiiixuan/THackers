import { Role } from "@prisma/client";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as eventService from "@/app/api/_lib/services/event.service";
import * as signupService from "@/app/api/_lib/services/signup.service";

const isEventManagerRole = (role?: Role) =>
  role === Role.CAREGIVER || role === Role.STAFF;

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    if (!isEventManagerRole(context?.dbUser?.role)) {
      return jsonError(403, "Only staff or caregivers can check in attendees");
    }

    const signup = await signupService.getSignupById(params.id);

    if (!signup) {
      return jsonError(404, "Signup not found");
    }

    const isCreator = await eventService.isEventCreator(
      signup.eventId,
      context!.user.id
    );

    if (!isCreator && context?.dbUser?.role !== Role.STAFF) {
      return jsonError(403, "Only the event creator can check in attendees");
    }

    const updated = await signupService.checkInSignup(params.id);

    return Response.json({
      success: true,
      data: { signup: updated },
      message: "Attendance checked in",
    });
  } catch (error) {
    console.error("Check-in signup error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to check in";
    return jsonError(400, errorMessage);
  }
}
