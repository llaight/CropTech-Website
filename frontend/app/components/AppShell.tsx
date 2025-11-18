"use client";

import React, { useEffect, useState } from "react";
import SideNav from "./Side-nav";
import AppHeader from "./AppHeader";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const sync = () => setAuthed(!!localStorage.getItem("token"));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("auth:changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth:changed", sync);
    };
  }, []);

  if (!authed) return <>{children}</>;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SideNav />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="min-h-full">{children}</div>
        </div>
      </div>
    </div>
  );
}