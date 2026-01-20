import { Role } from "@prisma/client";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as userService from "@/app/api/_lib/services/user.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    const url = new URL(req.url);
    const filter = url.searchParams.get("filter");

    const targetUser = await userService.getUserById(id);

    if (!targetUser) {
      return jsonError(404, "User not found");
    }

    const isSelf = context?.user?.id === id;
    const isStaff = context?.dbUser?.role === Role.STAFF;
    const isLinkedCaregiver =
      context?.dbUser?.role === Role.CAREGIVER
        ? await userService.isCaregiverForStudent(context.user.id, id)
        : false;

    const canAccess = isSelf || isStaff || isLinkedCaregiver;

    if (!canAccess) {
      return jsonError(403, "You do not have permission to view these events");
    }

    const options = {
      upcoming: filter === "upcoming",
      past: filter === "past",
    };

    const events = await userService.getUserEvents(id, options);
    const sanitizedEvents = events.map((event) => {
      const { checkInToken, ...rest } = event as Record<string, unknown>;
      return rest;
    });

    return Response.json({
      success: true,
      data: { events: sanitizedEvents },
    });
  } catch (error) {
    console.error("Get user events error:", error);
    return jsonError(500, "Failed to get user events");
  }
}
