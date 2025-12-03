"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import AuthForm from "./components/AuthForm";
import { useTheme } from "./components/ThemeProvider";
import AuthBackground from "./components/AuthBackground";
import AuthCard from "./components/AuthCard";

export default function Home() {
  const [mode, setMode] = useState<null | "login" | "signup">(null);

  // Initialize from localStorage to prevent initial unauth render flicker
  const [auth, setAuth] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("token");
    } catch {
      return false;
    }
  });

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ name?: string; role?: string } | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    // First mount sync
    try {
      const token = localStorage.getItem("token");
      const u = localStorage.getItem("user");
      setAuth(!!token);
      if (u) setUser(JSON.parse(u));
    } catch {
      // ignore
    } finally {
      setReady(true);
    }

    // Listen for auth changes (same-tab)
    const sync = () => {
      try {
        const token = localStorage.getItem("token");
        const u = localStorage.getItem("user");
        setAuth(!!token);
        if (u) setUser(JSON.parse(u));
        else setUser(null);
      } catch {
        setAuth(false);
        setUser(null);
      }
    };
    window.addEventListener("auth:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuth(false);
    setMode(null);
    window.dispatchEvent(new Event("auth:changed"));
  };

  // Avoid flicker: render nothing until initial auth check is done
  if (!ready) return null;

  // Authenticated Dashboard
  if (auth) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Dashboard Content */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome back{user?.name ? `, ${user.name}` : ""}! 👋
            </h2>
            <p className="text-slate-600">Here's what's happening with your farm today.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Fields</p>
                  <p className="text-2xl font-bold text-slate-900">12</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Crops</p>
                  <p className="text-2xl font-bold text-slate-900">8</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Harvest Yield</p>
                  <p className="text-2xl font-bold text-slate-900">2.4k kg</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Revenue</p>
                  <p className="text-2xl font-bold text-slate-900">$12.5k</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/fields" className="flex items-center p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Manage Fields</p>
                    <p className="text-sm text-slate-500">View and update your field information</p>
                  </div>
                </Link>
                <Link href="/inventory" className="flex items-center p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Check Inventory</p>
                    <p className="text-sm text-slate-500">Review your crop inventory and supplies</p>
                  </div>
                </Link>
                <Link href="/analytics" className="flex items-center p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">View Analytics</p>
                    <p className="text-sm text-slate-500">Analyze your farm performance and trends</p>
                  </div>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Field A - Wheat planted</p>
                    <p className="text-xs text-slate-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Inventory updated</p>
                    <p className="text-xs text-slate-500">4 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Harvest completed - Field B</p>
                    <p className="text-xs text-slate-500">1 day ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Unauthenticated Landing Page
  return (
    <AuthBackground>
      <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-md w-full">
          <AuthCard>
            {/* Auth Section */}
            <div className="space-y-6">
              {!mode ? (
                // Options view
                <div className="space-y-4">
                  <button
                    onClick={() => setMode("login")}
                    className={`w-full ${theme === 'dark' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'} text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${theme === 'dark' ? 'focus:ring-offset-green-600' : 'focus:ring-offset-green-100'}`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setMode("signup")}
                    className={`w-full ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50' : 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300 hover:border-green-400'} font-semibold py-4 px-6 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${theme === 'dark' ? 'focus:ring-white/50 focus:ring-offset-green-600' : 'focus:ring-offset-green-100'}`}
                  >
                    Create Account
                  </button>
                </div>
              ) : (
                // Form view
                <div className="space-y-6">
                  {/* Back to options */}
                  <button
                    onClick={() => setMode(null)}
                    className={`flex items-center text-sm font-medium transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-green-800 hover:text-green-900'}`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to options
                  </button>
                  <AuthForm mode={mode} />
                </div>
              )}
            </div>
          </AuthCard>
        </div>
      </div>
    </AuthBackground>
  );
}