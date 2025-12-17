"use client";

import React, { useState } from "react";
import AuthCard from "../../components/AuthCard";
import { useTheme } from "../../components/ThemeProvider";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);
    // Backend integration will be added by backend team.
    // For now show a friendly confirmation after a short delay.
    setTimeout(() => {
      setMessage("If that email exists, we sent password reset instructions.");
      setLoading(false);
    }, 800);
  };

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} className="space-y-6 w-full">
        <div className="text-center">
          <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-green-900"} mb-2`}>
            Reset Password
          </h2>
          <p className={`${theme === "dark" ? "text-slate-300" : "text-green-700"} text-sm`}>
            Enter your account email and we'll send reset instructions.
          </p>
        </div>

        <div className="space-y-2">
          <label className={`block text-sm font-medium ${theme === "dark" ? "text-white" : "text-green-800"}`}>
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl ${theme === "dark" ? "text-white" : "text-green-900"} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200`}
              placeholder="Enter your email"
            />
          </div>
        </div>

        {message && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
            <p className={`text-sm ${theme === "dark" ? "text-slate-200" : "text-green-800"}`}>{message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full ${theme === "dark" ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700" : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"} text-white font-semibold py-3 px-6 rounded-xl shadow-lg disabled:opacity-60 transition-all duration-200`}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <div className="text-center text-sm">
          <Link href="/login" className={`${theme === "dark" ? "text-green-300" : "text-green-800"} hover:underline`}>
            Back to Sign In
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}