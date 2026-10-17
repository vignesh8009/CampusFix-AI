import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: ReactNode;
  tone?: "default" | "danger" | "good" | "warn";
}) {
  const bar = { default: "border-ink/30", danger: "border-red-600", good: "border-emerald-600", warn: "border-hazard" }[tone];
  return (
    <div className={`panel border-t-4 p-4 ${bar}`}>
      <div className="flex items-center justify-between text-muted">
        <p className="text-sm font-semibold text-ink">{label}</p>
        {icon}
      </div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
