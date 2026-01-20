import { Role } from "@prisma/client";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as eventService from "@/app/api/_lib/services/event.service";

const isEventManagerRole = (role?: Role) =>
  role === Role.CAREGIVER || role === Role.STAFF;

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    if (!isEventManagerRole(context?.dbUser?.role)) {
      return jsonError(403, "Only staff or caregivers can view event signups");
    }

    const isCreator = await eventService.isEventCreator(params.id, context!.user.id);

    if (!isCreator && context?.dbUser?.role !== Role.STAFF) {
      return jsonError(403, "Only the event creator or staff can view signups");
    }

    const signups = await eventService.getEventSignups(params.id);

    return Response.json({
      success: true,
      data: { signups },
    });
  } catch (error) {
    console.error("Get event signups error:", error);
    return jsonError(500, "Failed to get event signups");
  }
}
