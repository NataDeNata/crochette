import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import Link from "next/link"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,box-shadow,color,transform] duration-200 outline-none select-none motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[oklch(0.34_0.03_60)] hover:shadow-[0_6px_16px_-8px_oklch(0.28_0.02_60/0.4)]",
        outline:
          "border-[1.5px] border-primary text-primary bg-transparent hover:bg-primary/[0.06] hover:border-[oklch(0.2_0.02_60)] dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
        ghost: "hover:bg-muted hover:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:outline-destructive/40",
        link: "rounded-none text-primary underline-offset-4 hover:underline motion-safe:hover:translate-y-0",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5",
        xs: "h-6 gap-1 px-2 text-xs",
        sm: "h-auto px-5 py-[9px] text-[13px]",
        md: "h-auto px-7 py-3 text-sm",
        lg: "h-auto px-[30px] py-3.5 text-sm",
        icon: "size-8",
        "icon-xs": "size-6",
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

function Button({ variant, size, className, asChild = false, ...props }: ButtonAsLink | ButtonAsButton) {
  const classes = cn(buttonVariants({ variant, size, className }))

  if ("href" in props && typeof props.href === "string") {
    const { href, ...rest } = props as ButtonAsLink
    return (
      <Link href={href} data-slot="button" data-variant={variant} data-size={size} className={classes} {...rest}>
        {rest.children}
      </Link>
    )
  }

  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={classes}
      {...(props as ButtonAsButton)}
    />
  )
}

export { Button, buttonVariants }
