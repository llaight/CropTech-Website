"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthCard from "../../../components/AuthCard";
import { useTheme } from "../../../components/ThemeProvider";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams() as { token?: string };
  const token = params?.token ?? "";
  const { theme } = useTheme();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return false;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!validate()) return;

    setLoading(true);
    // Simulate backend call using the token (backend will implement real call)
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setMessage("Your password has been changed successfully. You can now sign in.");
      // Optionally clear inputs:
      setPassword("");
      setConfirm("");
    }, 900);
  };

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} className="space-y-6 w-full">
        <div className="text-center">
          <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-green-900"} mb-2`}>
            Reset Password
          </h2>
          <p className={`${theme === "dark" ? "text-slate-300" : "text-green-700"} text-sm`}>
            Enter a new password for your account.
          </p>
        </div>

        <div className="space-y-2">
          <label className={`block text-sm font-medium ${theme === "dark" ? "text-white" : "text-green-800"}`}>
            New Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl ${theme === "dark" ? "text-white" : "text-green-900"} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200`}
            placeholder="Enter new password"
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <label className={`block text-sm font-medium ${theme === "dark" ? "text-white" : "text-green-800"}`}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl ${theme === "dark" ? "text-white" : "text-green-900"} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200`}
            placeholder="Re-enter new password"
            minLength={8}
          />
        </div>

        {message && (
          <div className={`${success ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"} rounded-xl p-3`}>
            <p className={`text-sm ${theme === "dark" ? "text-slate-200" : success ? "text-green-800" : "text-red-700"}`}>{message}</p>
          </div>
        )}

        {!success ? (
          <button
            type="submit"
            disabled={loading}
            className={`w-full ${theme === "dark" ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700" : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"} text-white font-semibold py-3 px-6 rounded-xl shadow-lg disabled:opacity-60 transition-all duration-200`}
          >
            {loading ? "Saving..." : "Set New Password"}
          </button>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className={`w-full ${theme === "dark" ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-gradient-to-r from-green-600 to-green-700"} text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200`}
            >
              Sign In
            </button>
            <div className="text-center text-sm">
              <Link href="/login" className={`${theme === "dark" ? "text-green-300" : "text-green-800"} hover:underline`}>
                Or go to Sign In
              </Link>
            </div>
          </div>
        )}
      </form>
    </AuthCard>
  );
}