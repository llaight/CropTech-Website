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
  const [user, setUser] = useState<{ id?: number; name?: string; role?: string } | null>(null);
  const [stats, setStats] = useState({ totalFields: 0, activeCrops: 0, harvestYieldKg: 0, totalRevenuePhp: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const { theme } = useTheme();
  const isDark = theme === "dark";

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

  useEffect(() => {
    const loadStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const uRaw = localStorage.getItem('user');
        const u = uRaw ? JSON.parse(uRaw) : null;
        if (!token || !u?.id) return;

        const headers: any = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

        // Total fields
        const fieldsRes = await fetch(`http://localhost:5001/api/fields?user_id=${u.id}`, { headers });
        let totalFields = 0;
        if (fieldsRes.ok) {
          const j = await fieldsRes.json().catch(() => ({}));
          const fields = j.fields || [];
          totalFields = Array.isArray(fields) ? fields.length : 0;
        }

        // Active crops are crops that have a planting_date
        const cropsRes = await fetch(`http://localhost:5001/api/crops?user_id=${u.id}`, { headers });
        let activeCrops = 0;
        if (cropsRes.ok) {
          const cj = await cropsRes.json().catch(() => ({}));
          const crops = cj.crops || [];
          activeCrops = Array.isArray(crops) ? crops.filter((c: any) => !!c.planting_date).length : 0;
        }

        // Harvest yield from history
        const harvestRes = await fetch(`http://localhost:5001/api/harvest-history?user_id=${u.id}`, { headers });
        let harvestYieldKg = 0;
        if (harvestRes.ok) {
          const hj = await harvestRes.json().catch(() => ({}));
          const history = hj.harvest_history || [];
          harvestYieldKg = Array.isArray(history)
            ? history.reduce((sum: number, h: any) => sum + (h.actual_yield_kg || 0), 0)
            : 0;
        }

        // Total revenue from delivered deliveries
        const deliveriesRes = await fetch(`http://localhost:5001/api/deliveries?user_id=${u.id}`, { headers });
        let totalRevenuePhp = 0;
        if (deliveriesRes.ok) {
          const dj = await deliveriesRes.json().catch(() => ({}));
          const deliveries = dj.deliveries || [];
          totalRevenuePhp = Array.isArray(deliveries)
            ? deliveries
                .filter((d: any) => d.status === 'delivered')
                .reduce((sum: number, d: any) => sum + (d.total_revenue_php || 0), 0)
            : 0;
        }

        setStats({ totalFields, activeCrops, harvestYieldKg, totalRevenuePhp });
      } catch (e) {
        // swallow errors for dashboard
      }
    };
    if (auth) loadStats();
  }, [auth]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        const uRaw = localStorage.getItem('user');
        const u = uRaw ? JSON.parse(uRaw) : null;
        if (!token || !u?.id) return;

        const headers: any = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        
        const notifRes = await fetch(`http://localhost:5001/api/notifications?user_id=${u.id}&limit=5`, { headers });
        if (notifRes.ok) {
          const nj = await notifRes.json().catch(() => ({}));
          const notifs = nj.notifications || [];
          setNotifications(Array.isArray(notifs) ? notifs : []);
        }
      } catch (e) {
        // swallow errors for notifications
      }
    };
    if (auth) loadNotifications();
  }, [auth]);

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
      <div className={`min-h-[calc(100dvh-4rem)] ${isDark ? "bg-slate-900" : "bg-gradient-to-br from-slate-50 via-white to-slate-100"} overflow-hidden`}>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className={`text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"} mb-2`}>
              Welcome back{user?.name ? `, ${user.name}` : ""}! 👋
            </h2>
            <p className={`${isDark ? "text-slate-400" : "text-slate-600"}`}>Here's what's happening with your farm today.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className={`${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"} rounded-2xl shadow-lg overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${isDark ? "text-slate-400" : "text-slate-600"} text-sm font-medium`}>Total Fields</p>
                  <p className={`${isDark ? "text-white" : "text-slate-900"} text-2xl font-bold`}>{stats.totalFields}</p>
                </div>
                <div className={`${isDark ? "bg-green-900/30" : "bg-green-100"} w-12 h-12 rounded-xl flex items-center justify-center`}>
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className={`${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"} rounded-2xl shadow-lg overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${isDark ? "text-slate-400" : "text-slate-600"} text-sm font-medium`}>Active Crops</p>
                  <p className={`${isDark ? "text-white" : "text-slate-900"} text-2xl font-bold`}>{stats.activeCrops}</p>
                </div>
                <div className={`${isDark ? "bg-blue-900/30" : "bg-blue-100"} w-12 h-12 rounded-xl flex items-center justify-center`}>
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className={`${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"} rounded-2xl shadow-lg overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${isDark ? "text-slate-400" : "text-slate-600"} text-sm font-medium`}>Harvest Yield</p>
                  <p className={`${isDark ? "text-white" : "text-slate-900"} text-2xl font-bold`}>{stats.harvestYieldKg.toLocaleString()} kg</p>
                </div>
                <div className={`${isDark ? "bg-yellow-900/30" : "bg-yellow-100"} w-12 h-12 rounded-xl flex items-center justify-center`}>
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className={`${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"} rounded-2xl shadow-lg overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${isDark ? "text-slate-400" : "text-slate-600"} text-sm font-medium`}>Revenue</p>
                  <p className={`${isDark ? "text-white" : "text-slate-900"} text-2xl font-bold`}>{
                    (stats.totalRevenuePhp || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })
                  }</p>
                </div>
                <div className={`${isDark ? "bg-purple-900/30" : "bg-purple-100"} w-12 h-12 rounded-xl flex items-center justify-center`}>
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className={`${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"} rounded-2xl shadow-lg overflow-hidden p-6`}>
              <h3 className={`${isDark ? "text-white" : "text-slate-900"} text-lg font-semibold mb-4`}>Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/fields" className={`flex items-center p-3 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700" : "hover:bg-slate-50"}`}>
                  <div className={`${isDark ? "bg-green-900/30" : "bg-green-100"} w-10 h-10 rounded-lg flex items-center justify-center mr-3`}>
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`${isDark ? "text-white" : "text-slate-900"} font-medium`}>Manage Fields</p>
                    <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm`}>View and update your field information</p>
                  </div>
                </Link>
                <Link href="/inventory" className={`flex items-center p-3 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700" : "hover:bg-slate-50"}`}>
                  <div className={`${isDark ? "bg-blue-900/30" : "bg-blue-100"} w-10 h-10 rounded-lg flex items-center justify-center mr-3`}>
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className={`${isDark ? "text-white" : "text-slate-900"} font-medium`}>Check Inventory</p>
                    <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm`}>Review your crop inventory and supplies</p>
                  </div>
                </Link>
                <Link href="/analytics" className={`flex items-center p-3 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700" : "hover:bg-slate-50"}`}>
                  <div className={`${isDark ? "bg-purple-900/30" : "bg-purple-100"} w-10 h-10 rounded-lg flex items-center justify-center mr-3`}>
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`${isDark ? "text-white" : "text-slate-900"} font-medium`}>View Analytics</p>
                    <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm`}>Analyze your farm performance and trends</p>
                  </div>
                </Link>
              </div>
            </div>

            <div className={`${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"} rounded-2xl shadow-lg overflow-hidden p-6`}>
              <h3 className={`${isDark ? "text-white" : "text-slate-900"} text-lg font-semibold mb-4`}>Recent Activity</h3>
              <div className="space-y-4">
                {notifications.length > 0 ? (
                  notifications.map((notif: any) => {
                    const getNotifColor = (type: string) => {
                      if (type === 'harvest') return 'bg-yellow-500';
                      if (type === 'planted') return 'bg-green-500';
                      if (type.startsWith('delivery')) return 'bg-blue-500';
                      if (type === 'field_added') return 'bg-purple-500';
                      if (type === 'rice_variant_added') return 'bg-orange-500';
                      return 'bg-gray-500';
                    };

                    const getTimeAgo = (dateStr: string) => {
                      const date = new Date(dateStr);
                      const now = new Date();
                      const diffMs = now.getTime() - date.getTime();
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMins / 60);
                      const diffDays = Math.floor(diffHours / 24);

                      if (diffMins < 1) return 'Just now';
                      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
                      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                    };

                    return (
                      <div key={notif.notification_id} className="flex items-center space-x-3">
                        <div className={`w-2 h-2 ${getNotifColor(notif.type)} rounded-full`}></div>
                        <div className="flex-1">
                          <p className={`${isDark ? "text-white" : "text-slate-900"} text-sm font-medium`}>{notif.title}</p>
                          <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-xs`}>{getTimeAgo(notif.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4">
                    <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm`}>No recent activity</p>
                  </div>
                )}
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