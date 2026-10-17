import { z } from "zod";
import { CATEGORIES, PRIORITIES } from "../constants";

/** Accepts 0-1 or a 0-100 percentage and normalizes to 0-1. */
const confidence = z.preprocess((v) => {
  if (typeof v === "number" && v > 1 && v <= 100) return v / 100;
  return v;
}, z.number().min(0).max(1));

export const aiAnalysisSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  summary: z.string().trim().min(5).max(400),
  reasoning: z.string().trim().min(5).max(800),
  recommendedAction: z.string().trim().min(5).max(600),
  assignedTeam: z.string().trim().min(2).max(80),
  confidence,
});
export type AiAnalysis = z.infer<typeof aiAnalysisSchema>;

/**
 * Parse text returned by a model into a validated analysis.
 * Tolerates markdown code fences around the JSON. Returns null when invalid.
 */
export function parseAiResponse(text: string | null | undefined): AiAnalysis | null {
  if (!text) return null;
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const json = JSON.parse(cleaned.slice(start, end + 1));
    const result = aiAnalysisSchema.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
