"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    router.replace("/"); // go back to landing
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Image src="/ctlogo.png" alt="CropTech" width={24} height={24} className="rounded-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">CropTech</h1>
                <p className="text-xs text-slate-500">Agricultural Platform</p>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-slate-600 hover:text-green-600 font-medium transition-colors">
              Dashboard
            </Link>
            <Link href="/inventory" className="text-slate-600 hover:text-green-600 font-medium transition-colors">
              Inventory
            </Link>
            <Link href="/fields" className="text-slate-600 hover:text-green-600 font-medium transition-colors">
              Fields
            </Link>
            <Link href="/analytics" className="text-slate-600 hover:text-green-600 font-medium transition-colors">
              Analytics
            </Link>
            <Link href="/land-tracker" className="text-slate-600 hover:text-green-600 font-medium transition-colors">
              Land Tracker
            </Link>
            <Link href="/profile" className="text-slate-600 hover:text-green-600 font-medium transition-colors">
              Profile
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
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