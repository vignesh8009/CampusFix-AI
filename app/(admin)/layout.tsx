import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import { getGeminiModel, isGeminiConfigured } from "@/lib/ai/gemini";
import { ADMIN_COOKIE, getAuthMode, isAuthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The middleware already blocks unauthenticated requests; this is a second check.
  if (!(await isAuthorized(cookies().get(ADMIN_COOKIE)?.value))) redirect("/admin/login");

  const enabled = isGeminiConfigured();
  return (
    <div className="min-h-screen lg:flex">
      <AdminSidebar aiMode={enabled ? "gemini" : "demo"} model={enabled ? getGeminiModel() : null} authMode={getAuthMode()} />
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-8">
        {children}
      </main>
    </div>
  );
}
