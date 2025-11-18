"use client";

import React from "react";
import { useEffect, useState } from "react";
import SideNav from "./Side-nav";
import AppHeader from "./AppHeader";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const sync = () => setAuthed(!!localStorage.getItem("token"));
    // initial check
    sync();
    // storage doesn't fire in same tab, but keep for cross-tab updates
    window.addEventListener("storage", sync);
    // custom event for same-tab updates
    window.addEventListener("auth:changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth:changed", sync);
    };
  }, []);

  return authed ? (
    // Make the whole shell a fixed viewport and prevent body scroll
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Global header for authenticated routes */}
      <div id="app-header-portal">
        <AppHeader />
      </div>

      {/* Below the header: sticky sidebar + scrollable content */}
      <div className="flex flex-1 min-h-0">
        <SideNav />
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </div>
  ) : (
    // Unauthenticated: no sidebar, no header mount needed
    <>{children}</>
  );
}