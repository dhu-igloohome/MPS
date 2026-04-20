"use client";

import { Toaster } from "sonner";

/**
 * Global toast host — matches Igloo Foretracker tokens (see globals.css).
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      duration={4200}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast:
            "app-toast group/toast rounded-xl border border-app-border/90 bg-app-surface text-foreground shadow-[0_12px_40px_rgba(17,24,39,0.08)]",
          title: "text-sm font-medium text-foreground",
          description: "text-sm text-app-muted",
          actionButton:
            "rounded-lg bg-app-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-app-accent-hover",
          cancelButton:
            "rounded-lg border border-app-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-gray-50",
          closeButton:
            "rounded-lg border-0 bg-transparent text-app-muted hover:bg-gray-100 hover:text-foreground",
        },
      }}
    />
  );
}
