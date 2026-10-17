export const CATEGORIES = [
  "Electrical",
  "Wi-Fi / Network",
  "Plumbing / Water",
  "Cleaning",
  "Furniture",
  "Classroom Equipment",
  "Security",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_RANK: Record<Priority, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3,
};

export const COMPLAINT_STATUSES = [
  "Submitted",
  "Under Review",
  "In Progress",
  "Resolved",
  "Closed",
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
export const OPEN_COMPLAINT_STATUSES: readonly string[] = [
  "Submitted",
  "Under Review",
  "In Progress",
];

export const TICKET_STATUSES = [
  "Pending Approval",
  "Approved",
  "Assigned",
  "In Progress",
  "Resolved",
  "Cancelled",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const ACTIVE_TICKET_STATUSES: readonly string[] = [
  "Pending Approval",
  "Approved",
  "Assigned",
  "In Progress",
];

export const TEAM_BY_CATEGORY: Record<Category, string> = {
  Electrical: "Electrical Maintenance",
  "Wi-Fi / Network": "IT Support",
  "Plumbing / Water": "Plumbing Maintenance",
  Cleaning: "Housekeeping",
  Furniture: "General Maintenance",
  "Classroom Equipment": "Equipment Maintenance",
  Security: "Campus Security",
  Other: "General Maintenance",
};

export const LOCATION_SUGGESTIONS = [
  "Main Block",
  "Library",
  "Computer Science Block",
  "Mechanical Block",
  "Hostel A",
  "Hostel B",
  "Cafeteria",
  "Sports Complex",
  "Auditorium",
  "Administrative Block",
];

export const DEFAULT_DUPLICATE_THRESHOLD = 0.55;

/** Similarity threshold used to link likely duplicates. Configurable via DUPLICATE_THRESHOLD. */
export function getDuplicateThreshold(): number {
  const raw = Number(process.env.DUPLICATE_THRESHOLD);
  if (Number.isFinite(raw) && raw >= 0.1 && raw <= 1) return raw;
  return DEFAULT_DUPLICATE_THRESHOLD;
}

/** Number of related duplicate reports at which a Medium issue is escalated to High. */
export const REPEAT_ESCALATION_COUNT = 3;

export function isPriority(v: string): v is Priority {
  return (PRIORITIES as readonly string[]).includes(v);
}
export function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}
export function maxPriority(a: Priority, b: Priority): Priority {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}
export function bumpPriority(p: Priority, ceiling: Priority = "High"): Priority {
  const next = PRIORITIES[Math.min(PRIORITY_RANK[p] + 1, PRIORITY_RANK[ceiling])];
  return PRIORITY_RANK[next] > PRIORITY_RANK[p] ? next : p;
}
