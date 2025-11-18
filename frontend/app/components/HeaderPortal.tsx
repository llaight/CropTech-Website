"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function HeaderPortal({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find the top header mount point created by AppShell
    setContainer(document.getElementById("app-header-portal"));
  }, []);

  // Fallback: render inline if portal target isn't present (e.g., unauthenticated)
  if (!container) return <>{children}</>;

  return createPortal(<>{children}</>, container);
}