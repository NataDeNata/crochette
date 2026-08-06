import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import Link from "next/link"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,box-shadow,color,transform] duration-200 outline-none select-none motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* These three hover values were hardcoded cream-palette oklch literals,
         * which pinned every button on the site to one palette. They are now
         * derived from whichever tokens are in scope, so /admin renders exactly
         * as before and the storefront follows the Akari palette. Both mix
         * toward the surface's own ground, which reads as "recede slightly"
         * in either direction. */
        default:
          "bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary),var(--background)_14%)] hover:shadow-[0_6px_16px_-8px_color-mix(in_oklch,var(--foreground),transparent_60%)]",
        outline:
          "border-[1.5px] border-primary text-primary bg-transparent hover:bg-primary/[0.06] hover:border-[color-mix(in_oklch,var(--primary),var(--foreground)_25%)] dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
        ghost: "hover:bg-muted hover:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:outline-destructive/40",
        link: "rounded-none text-primary underline-offset-4 hover:underline motion-safe:hover:translate-y-0",
      },
      /* `xs` (h-6) and `icon-xs` (size-6) were removed: both were 24px, which
       * is exactly WCAG 2.5.8's AA floor with no margin and well under this
       * project's own 44px standard, and neither had a single call site in the
       * repo. Leaving them was leaving a loaded footgun for whoever next needs
       * "a slightly smaller button". The remaining small sizes are reachable
       * but grow to 44px under a coarse pointer -- see globals.css. */
      size: {
        default: "h-8 gap-1.5 px-2.5",
        sm: "h-auto px-5 py-[9px] text-[13px]",
        md: "h-auto px-7 py-3 text-sm",
        lg: "h-auto px-[30px] py-3.5 text-sm",
        icon: "size-8",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "lg",
    },
  }
)

type Variant = VariantProps<typeof buttonVariants>["variant"];
type Size = VariantProps<typeof buttonVariants>["size"];

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  asChild?: boolean;
};

type ButtonAsLink = CommonProps & { href: string } & Omit<
    React.ComponentProps<typeof Link>,
    "href" | "className"
  >;
type ButtonAsButton = CommonProps & { href?: undefined } & Omit<
    React.ComponentProps<"button">,
    "className"
  >;

/* cva's `defaultVariants` fill in the *classes* for an omitted prop but not the
 * prop itself, so `data-variant={variant}` rendered null on every button that
 * did not pass one explicitly — which is most of them. The attribute is not
 * decoration: globals.css selects on it for the coarse-pointer touch targets,
 * for icon-button min-width, and for the storefront's variant fills. Resolving
 * the defaults here means the attribute always describes what was actually
 * rendered, which is the only thing it was ever supposed to do. */
const DEFAULT_VARIANT = "default" satisfies Variant
const DEFAULT_SIZE = "lg" satisfies Size

function Button({ variant, size, className, asChild = false, ...props }: ButtonAsLink | ButtonAsButton) {
  const classes = cn(buttonVariants({ variant, size, className }))
  const resolvedVariant = variant ?? DEFAULT_VARIANT
  const resolvedSize = size ?? DEFAULT_SIZE

  if ("href" in props && typeof props.href === "string") {
    const { href, ...rest } = props as ButtonAsLink
    return (
      <Link
        href={href}
        data-slot="button"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={classes}
        {...rest}
      >
        {rest.children}
      </Link>
    )
  }

  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      className={classes}
      {...(props as ButtonAsButton)}
    />
  )
}

export { Button, buttonVariants }
