"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import AuthForm from "./components/AuthForm";
import ThemeToggle from "./components/ThemeToggle";
import { useTheme } from "./components/ThemeProvider";

export default function Home() {
  const [mode, setMode] = useState<null | "login" | "signup">(null);
  const [auth, setAuth] = useState(false);
  const [user, setUser] = useState<{ name?: string; role?: string } | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
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

  // Authenticated Dashboard
  if (auth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Premium Header */}
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

        {/* Dashboard Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
    <div className={`min-h-screen relative overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-green-50 via-green-100 to-green-200'}`}>
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-white/5' : 'bg-green-500/10'}`} style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>
      
      {/* Floating Elements */}
      <div className={`absolute top-20 left-10 w-72 h-72 ${theme === 'dark' ? 'bg-green-500/10' : 'bg-green-400/20'} rounded-full blur-3xl animate-pulse`}></div>
      <div className={`absolute bottom-20 right-10 w-96 h-96 ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-green-300/20'} rounded-full blur-3xl animate-pulse delay-1000`}></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Premium Card */}
          <div className={`${theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-white/80 border-green-200/50'} backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border`}>
            {/* Logo Section */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-20 h-20 ${theme === 'dark' ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-green-500 to-green-700'} rounded-2xl shadow-lg mb-4`}>
                <Image src="/ctlogo.png" alt="CropTech" width={48} height={48} className="rounded-lg" />
            </div>
              <h1 className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-green-900'} mb-2`}>
                Crop<span className={`${theme === 'dark' ? 'bg-gradient-to-r from-green-400 to-green-300' : 'bg-gradient-to-r from-green-600 to-green-500'} bg-clip-text text-transparent`}>Tech</span>
            </h1>
              <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-green-700'} text-lg`}>Advanced Agricultural Platform</p>
          </div>

            {/* Auth Section */}
            <div className="space-y-6">
            {!mode ? (
                <div className="space-y-4">
                <button
                  onClick={() => setMode("login")}
                    className={`w-full ${theme === 'dark' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'} text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${theme === 'dark' ? 'focus:ring-offset-slate-900' : 'focus:ring-offset-green-100'}`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setMode("signup")}
                    className={`w-full ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50' : 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300 hover:border-green-400'} font-semibold py-4 px-6 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${theme === 'dark' ? 'focus:ring-white/50 focus:ring-offset-slate-900' : 'focus:ring-offset-green-100'}`}
                  >
                    Create Account
                </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <button 
                    onClick={() => setMode(null)}
                    className="flex items-center text-slate-300 hover:text-white transition-colors text-sm font-medium"
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

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-green-600'}`}>
                By creating an account, you agree to our{" "}
                <a href="#" className={`${theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-700 hover:text-green-800'} transition-colors`}>Terms of Service</a>
                {" "}and{" "}
                <a href="#" className={`${theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-700 hover:text-green-800'} transition-colors`}>Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
