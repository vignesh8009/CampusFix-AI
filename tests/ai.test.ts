import { describe, expect, it, vi } from "vitest";
import { analyzeComplaintText } from "../lib/ai/analyze";
import { fallbackAnalyze } from "../lib/ai/fallback";
import { aiAnalysisSchema, parseAiResponse } from "../lib/ai/schema";

const input = {
  title: "Projector not turning on",
  description: "The projector in Lab 2 does not turn on and the remote does not respond.",
  location: "CS Block, Lab 2",
  category: "Classroom Equipment",
};

const goodJson = {
  category: "Classroom Equipment",
  priority: "Medium",
  summary: "Projector in Lab 2 is not powering on.",
  reasoning: "Single device failure affecting one lab.",
  recommendedAction: "Test the projector power supply and replace faulty parts.",
  assignedTeam: "Anyone",
  confidence: 0.9,
};

describe("AI response validation", () => {
  it("accepts valid JSON, including inside code fences", () => {
    expect(parseAiResponse(JSON.stringify(goodJson))).not.toBeNull();
    expect(parseAiResponse("```json\n" + JSON.stringify(goodJson) + "\n```")).not.toBeNull();
  });

  it("normalizes percentage confidence", () => {
    expect(aiAnalysisSchema.parse({ ...goodJson, confidence: 85 }).confidence).toBeCloseTo(0.85);
  });

  it("rejects invalid categories, priorities, and non-JSON text", () => {
    expect(parseAiResponse(JSON.stringify({ ...goodJson, category: "Magic" }))).toBeNull();
    expect(parseAiResponse(JSON.stringify({ ...goodJson, priority: "Urgent" }))).toBeNull();
    expect(parseAiResponse("I think this is a projector problem.")).toBeNull();
    expect(parseAiResponse("")).toBeNull();
    expect(parseAiResponse(undefined)).toBeNull();
  });
});

describe("analysis with Gemini and fallback", () => {
  it("uses Gemini output when valid and maps the team from the category", async () => {
    const generate = vi.fn().mockResolvedValue(JSON.stringify(goodJson));
    const r = await analyzeComplaintText(input, { generate, geminiEnabled: true });
    expect(r.source).toBe("gemini");
    expect(r.analysis.assignedTeam).toBe("Equipment Maintenance");
    expect(generate).toHaveBeenCalledOnce();
  });

  it("falls back when Gemini throws", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("503 unavailable"));
    const r = await analyzeComplaintText(input, { generate, geminiEnabled: true });
    expect(r.source).toBe("fallback");
    expect(r.fallbackReason).toContain("failed");
    expect(r.analysis.category).toBe("Classroom Equipment");
  });

  it("falls back when Gemini returns an invalid response", async () => {
    const generate = vi.fn().mockResolvedValue('{"category":"Nope"}');
    const r = await analyzeComplaintText(input, { generate, geminiEnabled: true });
    expect(r.source).toBe("fallback");
    expect(r.fallbackReason).toContain("validation");
  });

  it("does not call Gemini in demo mode", async () => {
    const generate = vi.fn();
    const r = await analyzeComplaintText(input, { generate, geminiEnabled: false });
    expect(r.source).toBe("fallback");
    expect(generate).not.toHaveBeenCalled();
  });

  it("keeps the safety floor even when Gemini says Low", async () => {
    const generate = vi.fn().mockResolvedValue(
      JSON.stringify({ ...goodJson, category: "Electrical", priority: "Low" })
    );
    const r = await analyzeComplaintText(
      { title: "Sparks from socket", description: "Sparks and a burning smell from the wall socket", location: "Lab", category: "Electrical" },
      { generate, geminiEnabled: true }
    );
    expect(r.analysis.priority).toBe("Critical");
    expect(r.safetyFlag).toBe(true);
  });

  it("fallback classifies Other complaints from keywords", () => {
    const r = fallbackAnalyze({ ...input, category: "Other" });
    expect(r.category).toBe("Classroom Equipment");
    expect(r.assignedTeam).toBe("Equipment Maintenance");
  });
});
