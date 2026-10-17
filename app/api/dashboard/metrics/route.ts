import { handleError, ok } from "@/lib/api";
import { getDashboardMetrics } from "@/lib/agent/tools";
import { getGeminiModel, isGeminiConfigured } from "@/lib/ai/gemini";
import { getDuplicateThreshold } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = await getDashboardMetrics();
    return ok({
      ...metrics,
      ai: {
        mode: isGeminiConfigured() ? "gemini" : "demo",
        model: isGeminiConfigured() ? getGeminiModel() : null,
      },
      duplicateThreshold: getDuplicateThreshold(),
    });
  } catch (err) {
    return handleError(err);
  }
}
