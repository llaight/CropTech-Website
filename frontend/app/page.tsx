"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import AuthForm from "./components/AuthForm";

export default function Home() {
  const [mode, setMode] = useState<null | "login" | "signup">(null);
  const [auth, setAuth] = useState(false);
  const [user, setUser] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    // check for token in localStorage (set by AuthForm on login)
    try {
      const token = localStorage.getItem("token");
      const u = localStorage.getItem("user");
      if (token) {
        setAuth(true);
        if (u) setUser(JSON.parse(u));
      }
    } catch (e) {
      // ignore JSON parse errors
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuth(false);
    setMode(null);
  };

  // Authenticated dashboard
  if (auth) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 shadow">
          <div className="flex items-center gap-4">
            <Image src="/ctlogo.png" alt="CropTech" width={120} height={28} />
            <h1 className="text-lg font-semibold">CropTech</h1>
          </div>

          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm hover:underline">Home</Link>
            <Link href="/inventory" className="text-sm hover:underline">Inventory</Link>
            <Link href="/fields" className="text-sm hover:underline">Fields</Link>
            <Link href="/analytics" className="text-sm hover:underline">Analytics</Link>
            <Link href="/profile" className="text-sm hover:underline">Profile</Link>
            <button onClick={handleSignOut} className="ml-4 text-sm text-red-600">Sign out</button>
          </nav>
        </header>

        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold">Welcome{user?.name ? `, ${user.name}` : ""}</h2>
          </div>
        </main>
      </div>
    );
  }

  // Unauthenticated selection + forms
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-2xl text-center">
        <header className="mb-8">
          <Image src="/ctlogo.png" alt="CropTech" width={160} height={34} className="mx-auto" />
          <h1 className="text-2xl font-semibold mt-4">CropTech</h1>
        </header>

        {!mode ? (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setMode("signup")}
              className="px-6 py-3 bg-green-600 text-white rounded-md shadow hover:bg-green-700"
            >
              Sign up
            </button>

            <button
              onClick={() => setMode("login")}
              className="px-6 py-3 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700"
            >
              Log in
            </button>
          </div>
        ) : (
          <div>
            <button onClick={() => setMode(null)} className="text-sm underline mb-4">
              ← Back
            </button>
            <div className="flex justify-center">
              <AuthForm mode={mode} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
