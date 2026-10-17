import { describe, expect, it } from "vitest";
import { computeMetrics } from "../lib/analytics/metrics";
import { computeInsights, InsightComplaint } from "../lib/analytics/insights";

const c = (id: string, status: string, priority: string, dup: string | null = null) => ({ id, status, priority, duplicateOfId: dup });

describe("dashboard metrics", () => {
  it("returns zeros for empty data", () => {
    expect(computeMetrics([], [])).toMatchObject({ total: 0, open: 0, critical: 0, resolved: 0, duplicates: 0, pendingTickets: 0 });
  });

  it("counts from the records provided", () => {
    const complaints = [
      c("1", "Submitted", "Critical"),
      c("2", "Under Review", "High", "1"),
      c("3", "Resolved", "Critical"),
      c("4", "In Progress", "Medium"),
      c("5", "Closed", "Low"),
    ];
    const tickets = [{ complaintId: "4", status: "In Progress" }];
    const m = computeMetrics(complaints, tickets);
    expect(m.total).toBe(5);
    expect(m.open).toBe(3);
    expect(m.critical).toBe(1); // resolved critical is not counted
    expect(m.resolved).toBe(1);
    expect(m.duplicates).toBe(1);
    expect(m.pendingTickets).toBe(1); // only complaint 1 awaits approval
    expect(m.activeTickets).toBe(1);
  });
});

describe("insights", () => {
  const now = new Date("2026-03-20T12:00:00Z");
  const day = 86400000;
  const row = (n: number, over: Partial<InsightComplaint> = {}): InsightComplaint => ({
    id: String(n), complaintId: `CF-${n}`, title: `t${n}`, category: "Electrical", location: "Library",
    priority: "Medium", status: "Submitted", duplicateOfId: null, createdAt: new Date(now.getTime() - n * day),
    resolvedAt: null, ...over,
  });

  it("shows empty state values when there is no data", () => {
    const i = computeInsights([], now);
    expect(i.hasEnoughData).toBe(false);
    expect(i.resolution.averageHours).toBeNull();
    expect(i.topCategories).toEqual([]);
  });

  it("does not report an average with too few resolved complaints", () => {
    const i = computeInsights([row(1, { status: "Resolved", resolvedAt: new Date(now.getTime()) })], now);
    expect(i.resolution.averageHours).toBeNull();
    expect(i.resolution.sampleSize).toBe(1);
  });

  it("calculates average resolution time from real timestamps", () => {
    const hrs = [10, 20, 30];
    const rows = hrs.map((h, k) => row(k + 1, { status: "Resolved", resolvedAt: new Date(now.getTime() - (k + 1) * day + h * 3600000) }));
    expect(computeInsights(rows, now).resolution.averageHours).toBe(20);
  });

  it("finds repeated unresolved issues and top locations", () => {
    const rows = [
      row(1, { id: "root" }),
      row(2, { duplicateOfId: "root", location: "library" }),
      row(3, { duplicateOfId: "root", category: "Cleaning", location: "Cafeteria" }),
    ];
    const i = computeInsights(rows, now);
    expect(i.repeatedUnresolved[0]).toMatchObject({ complaintId: "CF-1", reports: 3 });
    expect(i.topLocations[0]).toMatchObject({ count: 2 });
  });

  it("compares this week with last week only when last week has data", () => {
    const rows = [row(1), row(2), row(8), row(9), row(10)];
    const i = computeInsights(rows, now);
    expect(i.volumeChange.thisWeek).toBe(2);
    expect(i.volumeChange.lastWeek).toBe(3);
    expect(i.volumeChange.percent).toBe(-33);
    expect(computeInsights([row(1)], now).volumeChange.percent).toBeNull();
  });
});
