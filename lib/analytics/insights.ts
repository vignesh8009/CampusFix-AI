import { OPEN_COMPLAINT_STATUSES } from "../constants";

export interface InsightComplaint {
  id: string;
  complaintId: string;
  title: string;
  category: string;
  location: string;
  priority: string;
  status: string;
  duplicateOfId: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface CountItem {
  label: string;
  count: number;
}

export interface Insights {
  totalComplaints: number;
  hasEnoughData: boolean;
  topCategories: CountItem[];
  topLocations: CountItem[];
  repeatedUnresolved: { complaintId: string; title: string; location: string; reports: number }[];
  highPriority: { complaintId: string; title: string; location: string; priority: string; status: string }[];
  resolution: { averageHours: number | null; sampleSize: number; minimumSamples: number };
  volume: { label: string; count: number }[];
  volumeChange: { thisWeek: number; lastWeek: number; percent: number | null };
}

export const MIN_RESOLUTION_SAMPLES = 3;
export const MIN_COMPLAINTS_FOR_TRENDS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS = 6;

function tally(items: string[]): CountItem[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const raw of items) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    const cur = map.get(key);
    if (cur) cur.count++;
    else map.set(key, { label: raw.trim(), count: 1 });
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function computeInsights(complaints: InsightComplaint[], now: Date = new Date()): Insights {
  const isOpen = (c: InsightComplaint) => OPEN_COMPLAINT_STATUSES.includes(c.status);

  const topCategories = tally(complaints.map((c) => c.category)).slice(0, 6);
  const topLocations = tally(complaints.map((c) => c.location)).slice(0, 6);

  const dupCounts = new Map<string, number>();
  for (const c of complaints) {
    if (c.duplicateOfId) dupCounts.set(c.duplicateOfId, (dupCounts.get(c.duplicateOfId) ?? 0) + 1);
  }
  const repeatedUnresolved = complaints
    .filter((c) => isOpen(c) && !c.duplicateOfId && (dupCounts.get(c.id) ?? 0) >= 1)
    .map((c) => ({
      complaintId: c.complaintId,
      title: c.title,
      location: c.location,
      reports: (dupCounts.get(c.id) ?? 0) + 1,
    }))
    .sort((a, b) => b.reports - a.reports)
    .slice(0, 6);

  const highPriority = complaints
    .filter((c) => isOpen(c) && (c.priority === "High" || c.priority === "Critical"))
    .sort((a, b) => (a.priority === b.priority ? b.createdAt.getTime() - a.createdAt.getTime() : a.priority === "Critical" ? -1 : 1))
    .slice(0, 8)
    .map((c) => ({
      complaintId: c.complaintId,
      title: c.title,
      location: c.location,
      priority: c.priority,
      status: c.status,
    }));

  const durations = complaints
    .filter((c) => c.status === "Resolved" && c.resolvedAt)
    .map((c) => (c.resolvedAt!.getTime() - c.createdAt.getTime()) / 3600000)
    .filter((h) => h >= 0);
  const averageHours =
    durations.length >= MIN_RESOLUTION_SAMPLES
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : null;

  const buckets = new Array<number>(WEEKS).fill(0);
  for (const c of complaints) {
    const weeksAgo = Math.floor((now.getTime() - c.createdAt.getTime()) / (7 * DAY_MS));
    if (weeksAgo >= 0 && weeksAgo < WEEKS) buckets[weeksAgo]++;
  }
  const volume = buckets
    .map((count, i) => ({ label: i === 0 ? "This week" : i === 1 ? "Last week" : `${i} weeks ago`, count }))
    .reverse();
  const thisWeek = buckets[0];
  const lastWeek = buckets[1];

  return {
    totalComplaints: complaints.length,
    hasEnoughData: complaints.length >= MIN_COMPLAINTS_FOR_TRENDS,
    topCategories,
    topLocations,
    repeatedUnresolved,
    highPriority,
    resolution: { averageHours, sampleSize: durations.length, minimumSamples: MIN_RESOLUTION_SAMPLES },
    volume,
    volumeChange: {
      thisWeek,
      lastWeek,
      percent: lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null,
    },
  };
}
