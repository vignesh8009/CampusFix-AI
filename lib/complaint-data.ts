import type { CreateComplaintInput } from "./validation/schemas";

/** Builds the database record for a new complaint (pure, unit-tested). */
export function buildComplaintData(input: CreateComplaintInput, complaintId: string) {
  const anonymous = input.anonymous === true;
  return {
    complaintId,
    title: input.title.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
    category: input.category,
    // Do not store a name for anonymous reports.
    studentName: anonymous ? null : input.studentName?.trim() || null,
    anonymous,
    status: "Submitted",
    priority: "Medium",
  };
}
