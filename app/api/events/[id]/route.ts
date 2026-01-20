import { z } from "zod";
import { Role } from "@prisma/client";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as eventService from "@/app/api/_lib/services/event.service";

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().transform((str) => new Date(str)).optional(),
  endTime: z.string().transform((str) => new Date(str)).optional(),
  capacity: z.number().int().positive().nullable().optional(),
  requiresApproval: z.boolean().optional(),
  allowWaitlist: z.boolean().optional(),
});

const isEventManagerRole = (role?: Role) =>
  role === Role.CAREGIVER || role === Role.STAFF;

const sanitizeEvent = (event: Record<string, unknown>, canViewCheckIn: boolean) => {
  if (canViewCheckIn) return event;
  const { checkInToken, ...rest } = event;
  return rest;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await eventService.getEventById(id);

    if (!event) {
      return jsonError(404, "Event not found");
    }

    const { context } = await getAuthContext(req);
    const isCreator = context?.user?.id
      ? await eventService.isEventCreator(id, context.user.id)
      : false;

    const canViewCheckIn = isCreator && isEventManagerRole(context?.dbUser?.role);

    return Response.json({
      success: true,
      data: { event: sanitizeEvent(event as Record<string, unknown>, canViewCheckIn) },
    });
  } catch (error) {
    console.error("Get event error:", error);
    return jsonError(500, "Failed to get event");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getAuthContext(req);
    const { id } = await params;

    if (error) {
      return jsonError(error.status, error.message);
    }

    const isCreator = await eventService.isEventCreator(id, context!.user.id);

    if (!isCreator) {
      return jsonError(403, "Only the event creator can update this event");
    }

    const body = await req.json();
    const validation = updateEventSchema.safeParse(body);

    if (!validation.success) {
      return jsonError(400, validation.error.errors[0].message);
    }

    const event = await eventService.updateEvent(id, validation.data);

    if (!event) {
      return jsonError(404, "Event not found");
    }

    return Response.json({
      success: true,
      data: { event },
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error("Update event error:", error);
    return jsonError(500, "Failed to update event");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getAuthContext(req);
    const { id } = await params;

    if (error) {
      return jsonError(error.status, error.message);
    }

    const isCreator = await eventService.isEventCreator(id, context!.user.id);

    if (!isCreator) {
      return jsonError(403, "Only the event creator can delete this event");
    }

    await eventService.deleteEvent(id);

    return Response.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error);
    return jsonError(500, "Failed to delete event");
  }
}
