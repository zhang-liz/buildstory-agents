"use client";

import { useEffect } from "react";

interface ClientBodyProps {
  children: React.ReactNode;
}

/**
 * Client wrapper that resets body className after hydration (e.g. to clear
 * extension-injected classes). Renders children without an extra DOM node.
 */
export default function ClientBody({ children }: ClientBodyProps) {
  useEffect(() => {
    document.body.className = "antialiased";
  }, []);

  return <>{children}</>;
}
