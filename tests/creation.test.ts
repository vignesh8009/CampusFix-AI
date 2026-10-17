import { describe, expect, it } from "vitest";
import { buildComplaintData } from "../lib/complaint-data";
import { createComplaintSchema } from "../lib/validation/schemas";
import { COMPLAINT_ID_PATTERN, TICKET_ID_PATTERN, generateComplaintId, generateTicketId } from "../lib/ids";

const base = createComplaintSchema.parse({
  title: "Wi-Fi down in library",
  description: "No internet access in the library reading hall since this morning.",
  location: "Library",
  category: "Wi-Fi / Network",
  studentName: "Asha",
  anonymous: false,
});

describe("complaint creation", () => {
  it("builds a record with submitted status and the given ID", () => {
    const data = buildComplaintData(base, "CF-ABC234");
    expect(data.complaintId).toBe("CF-ABC234");
    expect(data.status).toBe("Submitted");
    expect(data.studentName).toBe("Asha");
  });

  it("never stores a name for anonymous reports", () => {
    const data = buildComplaintData({ ...base, anonymous: true }, "CF-ABC234");
    expect(data.studentName).toBeNull();
    expect(data.anonymous).toBe(true);
  });

  it("generates well-formed, unique IDs", () => {
    const ids = new Set(Array.from({ length: 500 }, () => generateComplaintId()));
    expect(ids.size).toBe(500);
    ids.forEach((id) => expect(id).toMatch(COMPLAINT_ID_PATTERN));
    expect(generateTicketId()).toMatch(TICKET_ID_PATTERN);
  });
});
