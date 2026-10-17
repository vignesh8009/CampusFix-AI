import { describe, expect, it } from "vitest";
import { contentTokens, findSimilar, normalizeText, scoreSimilarity, SimilarityInput } from "../lib/duplicate-detection";

const mk = (
  id: string,
  title: string,
  description: string,
  location: string,
  category: string,
  status = "Submitted"
): SimilarityInput => ({ id, complaintId: id, title, description, location, category, status, createdAt: new Date() });

const fanA = mk("a", "Fan not working in Room 204", "The ceiling fan in room 204 has stopped working since Monday", "Block A, Room 204", "Electrical");
const fanB = mk("b", "Ceiling fan broken Room 204", "Fan is dead and the class is very hot", "Block A - Room 204", "Electrical");
const wifi = mk("c", "Wi-Fi down in library", "No internet access in the library reading hall", "Library", "Wi-Fi / Network");
const libFan = mk("d", "Fan broken in library", "The fan in the library is broken", "Library", "Electrical");

describe("duplicate detection", () => {
  it("normalizes text and Wi-Fi spellings", () => {
    expect(normalizeText("  Wi-Fi   DOWN!! ")).toBe("wifi down");
    expect(contentTokens("Wi-Fi is broken").has("wifi")).toBe(true);
    expect(contentTokens("Wi-Fi is broken").has("fault")).toBe(false);
  });

  it("detects the same problem in the same room as a duplicate", () => {
    const [top] = findSimilar(fanA, [fanB, wifi], { threshold: 0.55 });
    expect(top.complaintId).toBe("b");
    expect(top.isDuplicate).toBe(true);
    expect(top.score).toBeGreaterThanOrEqual(0.55);
    expect(top.reasons.join(" ")).toContain("Same location");
  });

  it("does not match different categories", () => {
    const matches = findSimilar(fanA, [wifi], { threshold: 0.55 });
    expect(matches).toHaveLength(0);
  });

  it("does not treat a fan elsewhere as a duplicate", () => {
    const [m] = findSimilar(fanA, [libFan], { threshold: 0.55 });
    expect(m?.isDuplicate ?? false).toBe(false);
  });

  it("penalizes resolved complaints and never marks them as duplicates", () => {
    const open = scoreSimilarity(fanA, fanB).score;
    const resolved = scoreSimilarity(fanA, { ...fanB, status: "Resolved" }).score;
    expect(resolved).toBeLessThan(open);
    const [m] = findSimilar(fanA, [{ ...fanB, status: "Resolved" }], { threshold: 0.3 });
    expect(m.isDuplicate).toBe(false);
  });

  it("respects a configurable threshold", () => {
    expect(findSimilar(fanA, [fanB], { threshold: 0.99 })[0].isDuplicate).toBe(false);
    expect(findSimilar(fanA, [fanB], { threshold: 0.3 })[0].isDuplicate).toBe(true);
  });

  it("ignores the target itself", () => {
    expect(findSimilar(fanA, [fanA], { threshold: 0.5 })).toHaveLength(0);
  });
});
