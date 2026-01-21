"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToogle";
import { useTheme } from "./ThemeProvider";
import { clearCachedData } from "../lib/dataPreloader";

type User = { name?: string; role?: string } | null;

export default function AppHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

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
    clearCachedData(); // Clear preloaded data cache
    window.dispatchEvent(new Event("auth:changed"));
    router.replace("/"); // go back to landing
  };

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-xl shadow-sm transition-all duration-300 ease-in-out transform ${
        isDark
          ? "bg-slate-900 border-b border-slate-700"
          : "bg-white/80 border-b border-slate-200/60"
      }`}
    >
      <div className="w-full px-2 sm:px-3 lg:px-4">
        <div className="flex items-center h-16">
          {/* Left: Brand */}
          <div className="flex items-center gap-3 mr-auto">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image src="/ctlogo.png" alt="CropTech" width={56} height={56} className="block" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>CropTech</h1>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Agricultural Platform</p>
            </div>
          </div>

          {/* Right: User info + Theme + Sign out */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Theme toggle */}
            <ThemeToggle />

            <div className="text-right">
              <p className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{user?.name || "User"}</p>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"} capitalize`}>{user?.role || "Farmer"}</p>
            </div>
            <button
              onClick={handleSignOut}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isDark
                  ? "text-slate-300 hover:text-red-400 hover:bg-red-800/20"
                  : "text-slate-600 hover:text-red-600 hover:bg-red-50"
              }`}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}