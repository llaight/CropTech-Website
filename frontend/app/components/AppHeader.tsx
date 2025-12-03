"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToogle";

type User = { name?: string; role?: string } | null;

export default function AppHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) setUser(JSON.parse(u));
    } catch {
      setUser(null);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth:changed"));
    router.replace("/"); // go back to landing
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
      <div className="w-full px-2 sm:px-3 lg:px-4">
        <div className="flex items-center h-16">
          {/* Left: Brand */}
          <div className="flex items-center gap-3 mr-auto">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <Image src="/ctlogo.png" alt="CropTech" width={24} height={24} className="rounded-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">CropTech</h1>
              <p className="text-xs text-slate-500">Agricultural Platform</p>
            </div>
          </div>

          {/* Right: User info + Theme + Sign out */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Theme toggle */}
            <ThemeToggle />

            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user?.name || "User"}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role || "Farmer"}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}