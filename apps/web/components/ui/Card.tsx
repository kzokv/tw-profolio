import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-line bg-surface px-5 py-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,36,66,0.11)]",
        className,
      )}
      {...props}
    />
  );
}
