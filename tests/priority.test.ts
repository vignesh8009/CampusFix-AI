import { describe, expect, it } from "vitest";
import { derivePriority, finalizePriority } from "../lib/agent/priority";
import { bumpPriority } from "../lib/constants";

const rule = (title: string, description: string, category = "Electrical") =>
  derivePriority({ title, description, category });

describe("priority and safety rules", () => {
  it("marks a possible electrical hazard Critical and flags it", () => {
    const r = rule("Sparks from socket", "There was a burning smell near the socket");
    expect(r.priority).toBe("Critical");
    expect(r.safetyFlag).toBe(true);
  });

  it("rates a wide Wi-Fi outage High", () => {
    const r = rule("Wi-Fi down in whole hostel", "No internet for all students", "Wi-Fi / Network");
    expect(r.priority).toBe("High");
    expect(r.safetyFlag).toBe(false);
  });

  it("rates a localized equipment fault Medium", () => {
    expect(rule("Projector not turning on", "Projector in Lab 2 will not start", "Classroom Equipment").priority).toBe("Medium");
  });

  it("rates a cosmetic issue Low", () => {
    expect(rule("Peeling paint", "Paint is peeling on the corridor wall", "Other").priority).toBe("Low");
  });

  it("never lets the AI downgrade a dangerous issue", () => {
    const r = finalizePriority("Low", rule("Exposed wire", "Live wire hanging from the ceiling"));
    expect(r.priority).toBe("Critical");
    expect(r.raisedByRules).toBe(true);
    expect(r.safetyFlag).toBe(true);
  });

  it("lets the AI raise a priority above the rule suggestion", () => {
    const r = finalizePriority("High", rule("Projector not turning on", "Projector will not start", "Classroom Equipment"));
    expect(r.priority).toBe("High");
    expect(r.raisedByRules).toBe(false);
  });

  it("escalates one level but never beyond the ceiling", () => {
    expect(bumpPriority("Medium", "High")).toBe("High");
    expect(bumpPriority("High", "High")).toBe("High");
    expect(bumpPriority("Low", "High")).toBe("Medium");
  });
});
