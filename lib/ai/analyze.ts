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

/** Removes anything that looks like an API key. */
function redactSecrets(text: string): string {
  return text.replace(/AIza[0-9A-Za-z_-]{10,}|AQ\.[0-9A-Za-z_-]{10,}/g, "[redacted]");
}

/** Builds a short, safe description of an API failure (status code + trimmed message). */
function describeError(err: unknown): string {
  const status = (err as { status?: number })?.status;
  let detail = err instanceof Error ? err.message : "unknown error";
  // Defensive: never let anything that looks like an API key reach the UI or database.
  detail = redactSecrets(detail);
  return `Gemini request failed (${status ?? "error"}): ${detail.slice(0, 200)}`;
}

/**
 * Gemini sometimes wraps JSON in markdown fences or adds extra text.
 * Strip the fences and keep only the part between the first "{" and the last "}".
 */
function cleanAiText(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned.trim();
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

      // Try the cleaned text first, then the raw text as a backup.
      analysis = parseAiResponse(cleanAiText(text)) ?? parseAiResponse(text);

      if (analysis) {
        source = "gemini";
      } else {
        const preview = redactSecrets(text).replace(/\s+/g, " ").slice(0, 150);
        fallbackReason = `Gemini returned a response that failed validation: ${preview}`;
        console.error("[ai] Validation failed. Raw Gemini text:", redactSecrets(text).slice(0, 2000));
      }
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