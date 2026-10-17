"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ClipboardList, LayoutDashboard, LogOut, PlusCircle, Wrench, Cpu, Sparkles, ShieldAlert } from "lucide-react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/dashboard", label: "Complaints", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: ClipboardList },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/complaints/new", label: "New report", icon: PlusCircle },
];

export function AdminSidebar({
  aiMode,
  model,
  authMode,
}: {
  aiMode: "gemini" | "demo";
  model: string | null;
  authMode: "enabled" | "open-dev" | "locked";
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  }
  return (
    <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex flex-col gap-3 p-4 lg:h-full lg:gap-6">
        <div className="flex items-center justify-between">
          <Logo />
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname.startsWith("/dashboard") : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${
                  active ? "bg-sign text-white" : "text-ink hover:bg-ink/5"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        {authMode === "open-dev" && (
          <p role="alert" className="flex items-start gap-1.5 rounded-md border border-red-400 bg-red-50 p-2 text-xs text-red-900">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Admin is not password protected. Set ADMIN_PASSCODE in .env.
          </p>
        )}
        <div className="mt-auto rounded-md border border-line bg-paper p-3 text-xs">
          <p className="flex items-center gap-1.5 font-semibold">
            {aiMode === "gemini" ? <Sparkles className="h-3.5 w-3.5 text-sign" aria-hidden="true" /> : <Cpu className="h-3.5 w-3.5 text-hazard-dark" aria-hidden="true" />}
            {aiMode === "gemini" ? "Gemini AI enabled" : "Demo mode"}
          </p>
          <p className="mt-1 text-muted">
            {aiMode === "gemini" ? `Model: ${model}` : "Using keyword rules. Add GEMINI_API_KEY to enable AI."}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-muted">
            <Wrench className="h-3.5 w-3.5" aria-hidden="true" /> Tickets are internal; no staff are dispatched.
          </p>
        </div>
        {authMode === "enabled" && (
          <button type="button" onClick={logout} className="btn-secondary w-full !py-2">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        )}
      </div>
    </aside>
  );
}
