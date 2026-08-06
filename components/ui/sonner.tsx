"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  // Pinned to "light" rather than read from next-themes. There is no
  // ThemeProvider in this app and no dark theme (see app/globals.css), so
  // useTheme() returned undefined and the `= "system"` default took over —
  // which asked Sonner to follow the *OS* preference and render dark toasts
  // over a permanently light cream UI. `.toaster` happened to mask most of it
  // by pinning Sonner's colour variables to the light tokens, but the toaster
  // was still being told the wrong thing. Restore the useTheme() read if a
  // real dark theme is ever added.

  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      // Sonner's own theming variables live on `.toaster` in app/globals.css
      // rather than inline here — they are four static values with no runtime
      // input, and this is a vendored shadcn file that `shadcn add sonner`
      // would overwrite.
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
