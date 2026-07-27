import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-lg bg-secondary motion-safe:animate-pulse", className)}
    />
  );
}
