/**
 * Deterministic priority and safety rules.
 * The AI may RAISE a priority but can never push it below the "floor" set here.
 */
import { Priority, PRIORITY_RANK, maxPriority } from "../constants";

export interface PriorityRuleResult {
  /** Priority suggested by the rules alone (used by the fallback analyzer). */
  priority: Priority;
  /** Minimum priority the AI is not allowed to go below. */
  floor: Priority;
  /** True when the report may describe a safety hazard and needs urgent human review. */
  safetyFlag: boolean;
  reasons: string[];
}

const CRITICAL_TERMS = [
  "spark", "short circuit", "electric shock", "electrocut", "exposed wire", "live wire",
  "burning smell", "burnt smell", "smoke", "fire", "gas leak", "explosion", "collapse",
  "stuck in lift", "stuck in elevator", "trapped", "assault", "ceiling fell", "falling ceiling",
  "ceiling fall", "sewage overflow",
];
const SAFETY_HIGH_TERMS = [
  "flood", "broken glass", "glass shard", "slippery", "injur", "unsafe", "harass", "threat",
  "bleeding", "hanging wire", "loose wire", "sharp", "naked wire",
];
const OUTAGE_TERMS = [
  "no water", "no drinking water", "water shortage", "no power", "power cut", "power outage",
  "blackout", "no internet", "wifi down", "network down", "not connecting", "toilet overflow",
  "drain overflow", "overflowing toilet", "overflowing drain",
  "blocked drain", "clogged", "theft", "stolen", "lock broken",
];
const SCOPE_TERMS = [
  "entire", "whole", "all students", "everyone", "campus", "hostel", "multiple", "many students",
  "all rooms", "every", "building wide",
];
const COSMETIC_TERMS = [
  "paint", "scratch", "faded", "peeling", "stain", "graffiti", "cosmetic", "cobweb", "sticker",
  "minor", "dusty",
];

function includesTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}`).test(text);
}
function matched(text: string, terms: string[]): string[] {
  return terms.filter((t) => includesTerm(text, t));
}

export function derivePriority(input: {
  title: string;
  description: string;
  category: string;
}): PriorityRuleResult {
  const text = `${input.title} ${input.description}`.toLowerCase();
  const reasons: string[] = [];

  const critical = matched(text, CRITICAL_TERMS);
  if (critical.length > 0) {
    reasons.push(`Possible safety hazard (matched: ${critical.slice(0, 3).join(", ")})`);
    return { priority: "Critical", floor: "Critical", safetyFlag: true, reasons };
  }

  const safetyHigh = matched(text, SAFETY_HIGH_TERMS);
  if (safetyHigh.length > 0) {
    reasons.push(`Possible safety concern (matched: ${safetyHigh.slice(0, 3).join(", ")})`);
    return { priority: "High", floor: "High", safetyFlag: true, reasons };
  }

  const outage = matched(text, OUTAGE_TERMS);
  if (outage.length > 0) {
    const wide = matched(text, SCOPE_TERMS);
    if (wide.length > 0) {
      reasons.push(`Service outage affecting many people (matched: ${outage[0]}, ${wide[0]})`);
      return { priority: "High", floor: "High", safetyFlag: false, reasons };
    }
    reasons.push(`Service outage reported (matched: ${outage[0]})`);
    return { priority: "High", floor: "Medium", safetyFlag: false, reasons };
  }

  const cosmetic = matched(text, COSMETIC_TERMS);
  if (cosmetic.length > 0) {
    reasons.push("Looks cosmetic with no functional impact");
    return { priority: "Low", floor: "Low", safetyFlag: false, reasons };
  }

  reasons.push("Localized fault with no safety or outage signals");
  return { priority: "Medium", floor: "Low", safetyFlag: false, reasons };
}

export interface FinalPriority {
  priority: Priority;
  safetyFlag: boolean;
  reasons: string[];
  /** True when the AI suggestion was raised by a deterministic rule. */
  raisedByRules: boolean;
}

/** Combine an AI (or fallback) priority with the deterministic rules. */
export function finalizePriority(
  aiPriority: Priority,
  rules: PriorityRuleResult
): FinalPriority {
  const priority = maxPriority(aiPriority, rules.floor);
  const raisedByRules = PRIORITY_RANK[priority] > PRIORITY_RANK[aiPriority];
  const reasons = [...rules.reasons];
  if (raisedByRules) {
    reasons.push(`AI suggested ${aiPriority}; raised to ${priority} by safety rules`);
  }
  return { priority, safetyFlag: rules.safetyFlag, reasons, raisedByRules };
}
