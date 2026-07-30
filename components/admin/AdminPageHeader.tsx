import type { ReactNode } from "react";

/** Sticky page header: title, one-line subtitle, and an optional right-hand
 * slot for the page's own primary action ("+ New product", a filter row…).
 *
 * Each page renders its own rather than the layout deriving titles from
 * `usePathname()`. Two reasons: the actions slot is inherently page-local, and
 * a pathname→title map in the layout would be a second place that has to know
 * the route table — it would silently fall back to a blank title the next time
 * a route is added. This way a new page cannot forget to name itself.
 *
 * `bg-background/85` + `backdrop-blur` rather than an opaque fill so long
 * tables visibly scroll underneath it, matching the design's sticky header. */
export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 -mx-6 mb-2 border-b border-border bg-background/85 px-6 py-4 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="m-0 font-serif text-2xl leading-tight font-medium">{title}</h1>
          {subtitle ? <p className="m-0 mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
