import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/** How the big number is coloured. `warning` is the low-stock case: amber, not
 * `destructive`, because "plan a restock" is a different urgency from "a
 * customer is waiting on you" — see the note in app/admin/page.tsx. */
const TONE_CLASSES = {
  default: "",
  warning: "text-warning",
  destructive: "text-destructive",
} as const;

export function AdminStatCard({
  icon: Icon,
  label,
  value,
  meta,
  href,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** The line under the number — a delta, or plain descriptive text. */
  meta?: React.ReactNode;
  href?: string;
  tone?: keyof typeof TONE_CLASSES;
}) {
  const card = (
    <Card className="h-full transition-shadow hover:shadow-sm">
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.1em] text-brand uppercase">
          <Icon className="size-3.5" aria-hidden />
          {label}
        </div>
        <div className={`font-serif text-3xl leading-tight font-medium ${TONE_CLASSES[tone]}`}>
          {value}
        </div>
        {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
      </CardContent>
    </Card>
  );

  // Not every tile has somewhere to go (the revenue tile has no /admin/revenue),
  // so the link is optional rather than every tile being wrapped by default.
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
