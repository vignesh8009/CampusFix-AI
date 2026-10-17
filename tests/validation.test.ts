import { describe, expect, it } from "vitest";
import {
  complaintIdSchema,
  createComplaintSchema,
  createTicketSchema,
  parseFilters,
  updateTicketSchema,
} from "../lib/validation/schemas";

const valid = {
  title: "Fan not working in Room 204",
  description: "The ceiling fan has stopped working since Monday and the room is hot.",
  location: "Main Block, Room 204",
  category: "Electrical",
  anonymous: false,
};

describe("complaint validation", () => {
  it("accepts a valid complaint", () => {
    expect(createComplaintSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects short titles and descriptions with clear messages", () => {
    const r = createComplaintSchema.safeParse({ ...valid, title: "Fan", description: "Too short" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message);
      expect(msgs).toContain("Title must be at least 5 characters");
      expect(msgs).toContain("Description must be at least 20 characters");
    }
  });

  it("rejects an unknown category and a missing location", () => {
    const r = createComplaintSchema.safeParse({ ...valid, category: "Pizza", location: "" });
    expect(r.success).toBe(false);
  });

  it("defaults anonymous to false and treats name as optional", () => {
    const { anonymous: _a, ...rest } = valid;
    const r = createComplaintSchema.parse(rest);
    expect(r.anonymous).toBe(false);
    expect(r.studentName).toBeUndefined();
  });

  it("trims whitespace", () => {
    const r = createComplaintSchema.parse({ ...valid, title: "   Fan not working here   " });
    expect(r.title).toBe("Fan not working here");
  });
});

describe("id and filter validation", () => {
  it("normalizes complaint IDs to upper case and rejects bad ones", () => {
    expect(complaintIdSchema.parse(" cf-abc234 ")).toBe("CF-ABC234");
    expect(complaintIdSchema.safeParse("CF-OOO111").success).toBe(false);
    expect(complaintIdSchema.safeParse("123").success).toBe(false);
  });

  it("parses filters and ignores invalid values", () => {
    expect(parseFilters({ priority: "High", sort: "priority", q: "" })).toEqual({ priority: "High", sort: "priority" });
    expect(parseFilters({ priority: "Urgent" })).toEqual({ sort: "newest" });
  });

  it("requires an explicit approval boolean for tickets", () => {
    expect(createTicketSchema.safeParse({}).success).toBe(false);
    expect(createTicketSchema.safeParse({ approval: true }).success).toBe(true);
    expect(updateTicketSchema.safeParse({ status: "Teleported" }).success).toBe(false);
  });
});
