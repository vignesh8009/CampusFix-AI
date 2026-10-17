import { z } from "zod";
import {
  CATEGORIES,
  COMPLAINT_STATUSES,
  PRIORITIES,
  TICKET_STATUSES,
} from "../constants";
import { COMPLAINT_ID_PATTERN, TICKET_ID_PATTERN } from "../id-patterns";

export const createComplaintSchema = z.object({
  title: z
    .string({ required_error: "Enter a title for the problem" })
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(120, "Title must be 120 characters or fewer"),
  description: z
    .string({ required_error: "Describe the problem" })
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be 2000 characters or fewer"),
  location: z
    .string({ required_error: "Enter the building or location" })
    .trim()
    .min(2, "Enter the building or location")
    .max(120, "Location must be 120 characters or fewer"),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: "Choose a category" }),
  }),
  studentName: z
    .string()
    .trim()
    .max(80, "Name must be 80 characters or fewer")
    .optional(),
  anonymous: z.boolean().default(false),
});
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const complaintIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(COMPLAINT_ID_PATTERN, "Complaint IDs look like CF-ABC234");

export const ticketIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(TICKET_ID_PATTERN, "Ticket IDs look like TK-ABC234");

export const complaintFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.enum(CATEGORIES).optional(),
  location: z.string().trim().max(120).optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(COMPLAINT_STATUSES).optional(),
  sort: z.enum(["newest", "oldest", "priority"]).default("newest"),
});
export type ComplaintFilters = z.infer<typeof complaintFiltersSchema>;

export const updateComplaintStatusSchema = z.object({
  status: z.enum(COMPLAINT_STATUSES),
  notes: z.string().trim().max(1000).optional(),
});

export const createTicketSchema = z.object({
  approval: z.boolean({
    required_error: "Explicit admin approval is required",
    invalid_type_error: "Approval must be true or false",
  }),
  approvedBy: z.string().trim().max(80).optional(),
});

export const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES),
  resolutionNotes: z.string().trim().max(1000).optional(),
  assignedTeam: z.string().trim().min(2).max(80).optional(),
});

/** Turns query-string values (possibly empty strings) into a filters object. */
export function parseFilters(
  raw: Record<string, string | string[] | undefined>
): ComplaintFilters {
  const pick = (k: string) => {
    const v = raw[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() !== "" ? s : undefined;
  };
  const parsed = complaintFiltersSchema.safeParse({
    q: pick("q"),
    category: pick("category"),
    location: pick("location"),
    priority: pick("priority"),
    status: pick("status"),
    sort: pick("sort"),
  });
  return parsed.success ? parsed.data : { sort: "newest" };
}
