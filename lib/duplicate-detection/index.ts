/**
 * Duplicate detection for the MVP.
 *
 * This is a transparent, rule-based similarity score (token overlap + location +
 * category + status). It is NOT a machine-learning model.
 */
import { OPEN_COMPLAINT_STATUSES } from "../constants";

export interface SimilarityInput {
  id: string;
  complaintId: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: string;
  createdAt: Date;
  duplicateOfId?: string | null;
}

export interface SimilarityMatch {
  id: string;
  complaintId: string;
  title: string;
  location: string;
  status: string;
  score: number;
  isDuplicate: boolean;
  reasons: string[];
}

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "it", "its", "this", "that",
  "in", "on", "at", "of", "to", "for", "and", "or", "with", "from", "by", "has", "have",
  "had", "not", "no", "very", "since", "there", "here", "our", "we", "my", "i", "you",
  "please", "again", "also", "but", "as", "so", "can", "cannot", "cant", "dont", "doesnt",
  "near", "inside", "room", "block", "building", "floor",
]);

// Words that mean "something is wrong" are too generic to prove two reports match.
const GENERIC_FAULT = "fault";

const SYNONYMS: Record<string, string> = {
  wifi: "wifi", wi: "wifi", fi: "wifi", internet: "wifi", network: "wifi", wlan: "wifi",
  broken: GENERIC_FAULT, damaged: GENERIC_FAULT, faulty: GENERIC_FAULT, dead: GENERIC_FAULT,
  stopped: GENERIC_FAULT, defective: GENERIC_FAULT, failed: GENERIC_FAULT, failure: GENERIC_FAULT,
  malfunctioning: GENERIC_FAULT, malfunction: GENERIC_FAULT, working: GENERIC_FAULT,
  down: GENERIC_FAULT, issue: GENERIC_FAULT, problem: GENERIC_FAULT, damage: GENERIC_FAULT,
  leaking: "leak", leakage: "leak", leaks: "leak", dripping: "leak",
  tap: "tap", taps: "tap", faucet: "tap",
  lights: "light", lamp: "light", bulb: "light", tubelight: "light", lighting: "light",
  fans: "fan", toilet: "washroom", toilets: "washroom", restroom: "washroom", bathroom: "washroom",
  washrooms: "washroom", chairs: "chair", benches: "bench", desks: "desk", tables: "table",
  projectors: "projector", computers: "computer", pcs: "computer", switches: "switch",
  sockets: "socket", doors: "door", windows: "window", water: "water",
};

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/wi[\s-]?fi/g, "wifi")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Content tokens (generic "something is broken" words removed). */
export function contentTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of normalizeText(text).split(" ")) {
    if (!raw || STOPWORDS.has(raw)) continue;
    const t = SYNONYMS[raw] ?? raw;
    if (t === GENERIC_FAULT) continue;
    if (t.length < 2) continue;
    out.add(t);
  }
  return out;
}

/** Location tokens: keep room numbers and building words. */
function locationTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const t of normalizeText(text).split(" ")) {
    if (t && !["the", "of", "in", "at"].includes(t)) out.add(t);
  }
  return out;
}

export function diceCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  a.forEach((t) => {
    if (b.has(t)) shared++;
  });
  return (2 * shared) / (a.size + b.size);
}

export function locationSimilarity(a: string, b: string): number {
  const ta = locationTokens(a);
  const tb = locationTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  const dice = diceCoefficient(ta, tb);
  if (normalizeText(a) === normalizeText(b)) return 1;
  return dice >= 0.99 ? 1 : dice;
}

const WEIGHTS = { text: 0.55, location: 0.25, category: 0.2 };
const RESOLVED_PENALTY = 0.7;
const MIN_TEXT_SIMILARITY = 0.25;

export function scoreSimilarity(
  target: Pick<SimilarityInput, "title" | "description" | "location" | "category">,
  candidate: Pick<SimilarityInput, "title" | "description" | "location" | "category" | "status">
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const sameCategory = target.category === candidate.category;
  const textSim = diceCoefficient(
    contentTokens(`${target.title} ${target.title} ${target.description}`),
    contentTokens(`${candidate.title} ${candidate.title} ${candidate.description}`)
  );
  const locSim = locationSimilarity(target.location, candidate.location);

  // A match needs the same category and some real shared subject words.
  if (!sameCategory || textSim < MIN_TEXT_SIMILARITY) {
    return { score: Math.round(textSim * WEIGHTS.text * 100) / 100, reasons: [] };
  }

  let score = WEIGHTS.text * textSim + WEIGHTS.location * locSim + WEIGHTS.category;
  reasons.push(`Same category (${target.category})`);
  reasons.push(`Wording overlap ${Math.round(textSim * 100)}%`);
  if (locSim >= 0.99) reasons.push("Same location");
  else if (locSim > 0.3) reasons.push("Similar location");

  const isOpen = OPEN_COMPLAINT_STATUSES.includes(candidate.status);
  if (!isOpen) {
    score *= RESOLVED_PENALTY;
    reasons.push("Already resolved (possible recurrence)");
  } else {
    reasons.push("Still unresolved");
  }
  return { score: Math.round(score * 100) / 100, reasons };
}

export interface FindSimilarOptions {
  threshold: number;
  /** Candidates scoring below this are dropped from the results. */
  minScore?: number;
  limit?: number;
}

export function findSimilar(
  target: SimilarityInput,
  candidates: SimilarityInput[],
  { threshold, minScore = 0.35, limit = 5 }: FindSimilarOptions
): SimilarityMatch[] {
  const matches: SimilarityMatch[] = [];
  for (const c of candidates) {
    if (c.id === target.id) continue;
    const { score, reasons } = scoreSimilarity(target, c);
    if (score < minScore || reasons.length === 0) continue;
    matches.push({
      id: c.id,
      complaintId: c.complaintId,
      title: c.title,
      location: c.location,
      status: c.status,
      score,
      isDuplicate: score >= threshold && OPEN_COMPLAINT_STATUSES.includes(c.status),
      reasons,
    });
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}
