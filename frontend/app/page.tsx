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
  const heroBgStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    // layered backgrounds:
    // 1) linear main gradient (diagonal)
    // 2) radial overlay to create the soft darker band
    background: `
      linear-gradient(-45deg, #90C67C 15%, #328E6E 66%),
      radial-gradient(40% 30% at 62% 40%, rgba(0,0,0,0.12), rgba(0,0,0,0) 45%)
    `,
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  };

  return (
    <div style={heroBgStyle}>
      <div className="w-full max-w-md mx-auto">
        {/* translucent card so gradient shows through slightly */}
        <div
          className="rounded-3xl py-12 px-8 md:px-12 text-center shadow-2xl"
          style={{
            background: "rgba(252, 251, 242, 0.92)", // slightly translucent off-white so the gradient shows through
            backdropFilter: "saturate(120%) blur(6px)",
          }}
        >
          {/* Logo + Title */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-28 h-28 flex items-center justify-center rounded-full bg-white/70 shadow-inner">
              {/* temporary icon area - replace /public/ctlogo.png later */}
              <Image src="/ctlogo.png" alt="CropTech" width={96} height={96} priority />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-4">
              Crop<span className="text-[#67AE6E]">Tech</span>
            </h1>
          </div>

          {/* Buttons */}
          <div className="mt-10 flex flex-col items-center gap-6">
            {!mode ? (
              <>
                <button
                  onClick={() => setMode("login")}
                  className="w-64 md:w-72 py-3 rounded-full font-bold text-white shadow-lg transform active:scale-95 transition"
                  style={{
                    background: "linear-gradient(90deg,#90C67C,#90C67C)",
                    boxShadow: "0 10px 18px rgba(31,138,92,0.18)",
                  }}
                >
                  Sign In
                </button>

                <button
                  onClick={() => setMode("signup")}
                  className="w-64 md:w-72 py-3 rounded-full font-bold text-white shadow-lg transform active:scale-95 transition"
                  style={{
                    background: "linear-gradient(90deg,#328E6E,#328E6E)",
                    boxShadow: "0 10px 18px rgba(22,108,75,0.22)",
                  }}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <div className="w-full">
                <button onClick={() => setMode(null)} className="text-sm underline mb-4 self-start">
                  ← Back
                </button>

                <div className="mx-auto max-w-md">
                  <AuthForm mode={mode} />
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 mt-8">By creating an account you agree to our Terms & Privacy Policy</p>
        </div>
      </div>
    </div>
  );
}
