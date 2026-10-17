/** Deterministic keyword-based analysis used in demo mode and when Gemini fails. */
import { CATEGORIES, Category, TEAM_BY_CATEGORY } from "../constants";
import { derivePriority } from "../agent/priority";
import type { AiAnalysis } from "./schema";

export interface ComplaintTextInput {
  title: string;
  description: string;
  location: string;
  category: string;
}

const KEYWORDS: Record<Exclude<Category, "Other">, string[]> = {
  Electrical: [
    "electric", "power", "light", "bulb", "tube", "switch", "socket", "fan", "spark", "wire",
    "voltage", "outlet", "tripped", "circuit", "transformer", "generator", "shock", "mcb",
  ],
  "Wi-Fi / Network": [
    "wifi", "wi-fi", "internet", "network", "router", "lan ", "ethernet", "bandwidth", "signal",
    "access point", "login portal", "slow connection",
  ],
  "Plumbing / Water": [
    "water", "tap", "leak", "pipe", "drain", "flush", "toilet", "sink", "tank", "plumb", "seepage",
    "overflow", "faucet", "geyser", "cooler",
  ],
  Cleaning: [
    "dirty", "unclean", "garbage", "trash", "dustbin", "smell", "stink", "sweep", "mop", "hygiene",
    "washroom", "cleaning", "litter", "cockroach", "pest",
  ],
  Furniture: [
    "chair", "bench", "desk", "table", "cupboard", "locker", "shelf", "wobbly", "furniture",
    "board", "cabinet",
  ],
  "Classroom Equipment": [
    "projector", "smartboard", "whiteboard", "speaker", "microphone", "mic", "screen", "computer",
    "remote", "hdmi", "podium", "lab equipment", "monitor", "keyboard",
  ],
  Security: [
    "security", "cctv", "theft", "stolen", "lock", "gate", "guard", "unsafe", "harass", "camera",
    "trespass", "lighting dark",
  ],
};

const ACTIONS: Record<Category, string> = {
  Electrical:
    "Inspect the fixture and circuit, isolate the supply if there is any hazard, then repair or replace the faulty component.",
  "Wi-Fi / Network":
    "Check the access point and switch serving this area, restart or replace faulty equipment, and verify coverage after the fix.",
  "Plumbing / Water":
    "Inspect pipes, taps and tanks at the location, fix leaks or blockages, and confirm normal water flow.",
  Cleaning:
    "Schedule a deep clean of the area, restock supplies, and review the cleaning rota for this location.",
  Furniture:
    "Inspect the furniture, repair or replace damaged items, and remove unsafe pieces from use until fixed.",
  "Classroom Equipment":
    "Test the equipment on site, repair or replace faulty parts, and confirm it works before the next class.",
  Security:
    "Notify campus security to review the location, check locks, lighting and cameras, and follow up with the reporter if needed.",
  Other:
    "Assign a maintenance staff member to inspect the location and decide which team should handle the repair.",
};

function termHits(text: string, terms: string[]): number {
  let n = 0;
  for (const t of terms) if (text.includes(t)) n++;
  return n;
}

export function keywordCategoryScores(input: ComplaintTextInput): Record<string, number> {
  const title = input.title.toLowerCase();
  const full = `${input.title} ${input.description}`.toLowerCase();
  const scores: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    if (cat === "Other") continue;
    const kws = KEYWORDS[cat];
    scores[cat] = termHits(full, kws) + termHits(title, kws);
  }
  return scores;
}

export function fallbackAnalyze(input: ComplaintTextInput): AiAnalysis {
  const scores = keywordCategoryScores(input);
  let best: Category = "Other";
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    if (cat === "Other") continue;
    if (scores[cat] > bestScore) {
      best = cat;
      bestScore = scores[cat];
    }
  }

  const chosen = (CATEGORIES as readonly string[]).includes(input.category)
    ? (input.category as Category)
    : "Other";
  let category: Category = chosen;
  let confidence = 0.6;
  if (chosen === "Other" && bestScore > 0) {
    category = best;
    confidence = Math.min(0.75, 0.5 + bestScore * 0.05);
  } else if (chosen !== "Other" && best !== chosen && bestScore >= 2 && (scores[chosen] ?? 0) === 0) {
    category = best;
    confidence = 0.55;
  } else if (chosen !== "Other" && (scores[chosen] ?? 0) > 0) {
    confidence = Math.min(0.8, 0.6 + (scores[chosen] ?? 0) * 0.04);
  }

  const rules = derivePriority(input);
  const summary = `${category} issue at ${input.location}: ${input.title.trim()}`.slice(0, 400);
  const reasoning =
    `Keyword-based demo analysis (no AI model used). ${rules.reasons.join(". ")}.` +
    (category !== chosen ? ` Category changed from ${chosen} based on wording.` : "");

  return {
    category,
    priority: rules.priority,
    summary,
    reasoning: reasoning.slice(0, 800),
    recommendedAction: ACTIONS[category],
    assignedTeam: TEAM_BY_CATEGORY[category],
    confidence: Math.round(confidence * 100) / 100,
  };
}
