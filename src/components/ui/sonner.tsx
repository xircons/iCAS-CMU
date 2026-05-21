"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** No ThemeProvider yet: force light toaster palette so title/description always contrast Sonner internals. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      visibleToasts={4}
      expand
      gap={12}
      theme="light"
      className="toaster group"
      toastOptions={{
        duration: 4500,
        style: {
          width: "fit-content",
          maxWidth: "min(92vw, 28rem)",
          minWidth: 0,
        },
        className: "toast-responsive",
      }}
      {...props}
    />
  );
};

export { Toaster };
