"use client"

import { isDarkAppTheme, useTheme } from "@/components/providers/theme-provider"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={isDarkAppTheme(theme) ? "dark" : "light"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast border border-border/60 bg-popover text-popover-foreground shadow-lg backdrop-blur-sm",
          title: "font-medium",
          description: "text-muted-foreground",
          success: "border-success/35",
          error: "border-destructive/40",
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
