import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";

type Variant = "solid" | "outline";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2.5 rounded-full font-medium " +
  "transition-[background-color,border-color,box-shadow,transform] duration-200 " +
  "motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.97] " +
  "disabled:pointer-events-none disabled:cursor-not-allowed " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.55_0.09_20)]";

const VARIANTS: Record<Variant, string> = {
  solid:
    "bg-[oklch(0.28_0.02_60)] text-[oklch(0.98_0.01_85)] " +
    "hover:bg-[oklch(0.34_0.03_60)] hover:shadow-[0_6px_16px_-8px_oklch(0.28_0.02_60/0.4)] " +
    "disabled:opacity-50",
  outline:
    "border-[1.5px] border-[oklch(0.28_0.02_60)] text-[oklch(0.28_0.02_60)] " +
    "hover:bg-[oklch(0.28_0.02_60/0.06)] hover:border-[oklch(0.2_0.02_60)] " +
    "disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "px-5 py-[9px] text-[13px]",
  md: "px-7 py-3 text-sm",
  lg: "px-[30px] py-3.5 text-sm",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsLink = CommonProps & { href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className" | "children">;
type ButtonAsButton = CommonProps & { href?: undefined } & Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

export function Button({ variant = "solid", size = "lg", className, children, ...props }: ButtonAsLink | ButtonAsButton) {
  const classes = [BASE, VARIANTS[variant], SIZES[size], className].filter(Boolean).join(" ");

  if ("href" in props && typeof props.href === "string") {
    const { href, ...rest } = props as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as ButtonAsButton)}>
      {children}
    </button>
  );
}
