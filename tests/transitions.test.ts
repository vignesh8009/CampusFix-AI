import { describe, expect, it } from "vitest";
import {
  canCreateTicket,
  canTransitionComplaint,
  canTransitionTicket,
  complaintStatusForTicket,
  validateResolutionNotes,
} from "../lib/agent/transitions";

describe("ticket approval rules", () => {
  const ctx = { approval: true, complaintStatus: "Under Review", activeTicketCount: 0 };

  it("requires explicit approval", () => {
    expect(canCreateTicket({ ...ctx, approval: false }).ok).toBe(false);
  });
  it("allows a ticket for an open complaint with approval", () => {
    expect(canCreateTicket(ctx).ok).toBe(true);
  });
  it("blocks a second active ticket unless explicitly permitted", () => {
    expect(canCreateTicket({ ...ctx, activeTicketCount: 1 }).ok).toBe(false);
    expect(canCreateTicket({ ...ctx, activeTicketCount: 1, allowMultipleActive: true }).ok).toBe(true);
  });
  it("blocks tickets for duplicates and closed complaints", () => {
    expect(canCreateTicket({ ...ctx, duplicateOfComplaintId: "CF-ABC234" }).reason).toContain("CF-ABC234");
    expect(canCreateTicket({ ...ctx, complaintStatus: "Resolved" }).ok).toBe(false);
  });
});

describe("status transitions", () => {
  it("allows the normal complaint flow", () => {
    expect(canTransitionComplaint("Submitted", "Under Review").ok).toBe(true);
    expect(canTransitionComplaint("Under Review", "In Progress").ok).toBe(true);
    expect(canTransitionComplaint("In Progress", "Resolved").ok).toBe(true);
  });
  it("rejects skipping or repeating states", () => {
    expect(canTransitionComplaint("Submitted", "Resolved").ok).toBe(false);
    expect(canTransitionComplaint("Resolved", "In Progress").ok).toBe(false);
    expect(canTransitionComplaint("Under Review", "Under Review").ok).toBe(false);
    expect(canTransitionComplaint("Bogus", "Closed").ok).toBe(false);
  });
  it("allows reopening a resolved complaint", () => {
    expect(canTransitionComplaint("Resolved", "Under Review").ok).toBe(true);
  });
  it("follows the ticket lifecycle", () => {
    expect(canTransitionTicket("Approved", "Assigned").ok).toBe(true);
    expect(canTransitionTicket("Assigned", "In Progress").ok).toBe(true);
    expect(canTransitionTicket("In Progress", "Resolved").ok).toBe(true);
    expect(canTransitionTicket("Approved", "Resolved").ok).toBe(false);
    expect(canTransitionTicket("Resolved", "In Progress").ok).toBe(false);
    expect(canTransitionTicket("Cancelled", "Approved").ok).toBe(false);
  });
  it("requires resolution notes to resolve", () => {
    expect(validateResolutionNotes("Resolved", "").ok).toBe(false);
    expect(validateResolutionNotes("Resolved", "Replaced the capacitor").ok).toBe(true);
    expect(validateResolutionNotes("In Progress", "").ok).toBe(true);
  });
  it("keeps complaint status consistent with ticket status", () => {
    expect(complaintStatusForTicket("In Progress")).toBe("In Progress");
    expect(complaintStatusForTicket("Resolved")).toBe("Resolved");
    expect(complaintStatusForTicket("Cancelled")).toBe("Under Review");
    expect(complaintStatusForTicket("Pending Approval")).toBeNull();
  });
});
