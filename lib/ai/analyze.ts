import { TEAM_BY_CATEGORY, Priority, Category } from "../constants";
import { derivePriority, finalizePriority } from "../agent/priority";
import { fallbackAnalyze, ComplaintTextInput } from "./fallback";
import { buildPrompt, generateWithGemini, isGeminiConfigured } from "./gemini";
import { parseAiResponse, AiAnalysis } from "./schema";

export type AnalysisSource = "gemini" | "fallback";

export interface AnalysisResult {
  analysis: AiAnalysis;
  source: AnalysisSource;
  /** Why the fallback was used (never contains secrets). */
  fallbackReason?: string;
  safetyFlag: boolean;
  priorityReasons: string[];
}

export interface AnalyzeOptions {
  /** Injectable for tests. Defaults to the real Gemini call. */
  generate?: (prompt: string) => Promise<string>;
  /** Force the "configured" state in tests. */
  geminiEnabled?: boolean;
}

/** Builds a short, safe description of an API failure (status code + trimmed message). */
function describeError(err: unknown): string {
  const status = (err as { status?: number })?.status;
  let detail = err instanceof Error ? err.message : "unknown error";
  // Defensive: never let anything that looks like an API key reach the UI or database.
  detail = detail.replace(/AIza[0-9A-Za-z_-]{10,}|AQ\.[0-9A-Za-z_-]{10,}/g, "[redacted]");
  return `Gemini request failed (${status ?? "error"}): ${detail.slice(0, 200)}`;
}

/**
 * Analyze a complaint with Gemini when configured, otherwise (or on ANY failure)
 * with the deterministic fallback. Safety rules are always applied afterwards.
 * This function never throws.
 */
export async function analyzeComplaintText(
  input: ComplaintTextInput,
  options: AnalyzeOptions = {}
): Promise<AnalysisResult> {
  const enabled = options.geminiEnabled ?? isGeminiConfigured();
  const generate = options.generate ?? ((p: string) => generateWithGemini(p));

  let analysis: AiAnalysis | null = null;
  let source: AnalysisSource = "fallback";
  let fallbackReason: string | undefined;

  if (!enabled) {
    fallbackReason = "No Gemini API key configured (demo mode)";
  } else {
    try {
      const text = await generate(buildPrompt(input));
      analysis = parseAiResponse(text);
      if (analysis) source = "gemini";
      else fallbackReason = "Gemini returned a response that failed validation";
    } catch (err) {
      fallbackReason = describeError(err);
      console.error("[ai] Gemini call failed:", fallbackReason);
    }
  }

  if (!analysis) analysis = fallbackAnalyze(input);

  // Team is always derived from the category so routing stays consistent.
  const category = analysis.category as Category;
  const rules = derivePriority(input);
  const final = finalizePriority(analysis.priority as Priority, rules);

  return {
    analysis: {
      ...analysis,
      priority: final.priority,
      assignedTeam: TEAM_BY_CATEGORY[category],
    },
    source,
    fallbackReason,
    safetyFlag: final.safetyFlag,
    priorityReasons: final.reasons,
  };
}
