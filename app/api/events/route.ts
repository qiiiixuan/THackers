import { z } from "zod";
import { Role } from "@prisma/client";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as eventService from "@/app/api/_lib/services/event.service";

const createEventSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    location: z.string().optional(),
    startTime: z.string().transform((str) => new Date(str)),
    endTime: z.string().transform((str) => new Date(str)),
    capacity: z.number().int().positive().nullable().optional(),
    requiresApproval: z.boolean().optional(),
    allowWaitlist: z.boolean().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
  });

const isEventManagerRole = (role?: Role) =>
  role === Role.CAREGIVER || role === Role.STAFF;

const sanitizeEvent = (event: Record<string, unknown>) => {
  const { checkInToken, ...rest } = event;
  return rest;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = url.searchParams.get("page");
    const limit = url.searchParams.get("limit");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const search = url.searchParams.get("search");

    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search: search || undefined,
    };

    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    const result = await eventService.getEvents(filters, pagination);
    const sanitizedEvents = result.events.map((event) =>
      sanitizeEvent(event as Record<string, unknown>)
    );

    return Response.json({
      success: true,
      data: { ...result, events: sanitizedEvents },
    });
  } catch (error) {
    console.error("Get events error:", error);
    return jsonError(500, "Failed to get events");
  }
}

export async function POST(req: Request) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    if (!isEventManagerRole(context?.dbUser?.role)) {
      return jsonError(403, "Only staff or caregivers can create events");
    }

    const body = await req.json();
    const validation = createEventSchema.safeParse(body);

    if (!validation.success) {
      return jsonError(400, validation.error.errors[0].message);
    }

    const event = await eventService.createEvent({
      ...validation.data,
      createdById: context!.user.id,
    });

    return Response.json({
      success: true,
      data: { event: sanitizeEvent(event as unknown as Record<string, unknown>) },
      message: "Event created successfully",
    });
  } catch (error) {
    console.error("Create event error:", error);
    return jsonError(500, "Failed to create event");
  }
}
