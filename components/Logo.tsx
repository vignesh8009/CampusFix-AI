import Link from "next/link";
import { Wrench } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-md" aria-label="CampusFix AI home">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sign text-white ring-2 ring-hazard">
        <Wrench className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="font-display text-lg font-bold leading-none tracking-tight">
        CampusFix <span className="text-sign">AI</span>
      </span>
    </Link>
  );
}
