"use client";

import React, { useState, useEffect } from "react";
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
  const [validating, setValidating] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Validate token when component mounts
    if (token) {
      validateToken();
    } else {
      setMessage("Invalid reset link. Please request a new password reset.");
      setValidating(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5001/api/validate-reset-token/${token}`);
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setEmail(data.email || "");
        setMessage("Token is valid. Please enter your new password.");
      } else {
        setMessage(data.message || "Invalid or expired token. Please request a new password reset.");
      }
    } catch (error) {
      console.error("Error validating token:", error);
      setMessage("Failed to validate token. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Client-side validation
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5001/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          new_password: password,
          confirm_password: confirm
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        setMessage(data.message);
        setPassword("");
        setConfirm("");
      } else {
        setMessage(data.message || "Failed to reset password. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <AuthCard>
        <div className="text-center">
          <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-green-900"} mb-4`}>
            Validating Reset Link...
          </h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
        </div>
      </AuthCard>
    );
  }

  // Fixed: Check if message exists and token is invalid/expired
  if (message && !success && (message.includes("Invalid") || message.includes("expired") || message.includes("already been used"))) {
    return (
      <AuthCard>
        <div className="text-center space-y-6">
          <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-green-900"} mb-2`}>
            Reset Link Invalid
          </h2>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className={`text-sm ${theme === "dark" ? "text-slate-200" : "text-red-700"}`}>
              {message}
            </p>
          </div>
          <Link 
            href="/forgot-password" 
            className={`block w-full ${theme === "dark" ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-gradient-to-r from-green-600 to-green-700"} text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200`}
          >
            Request New Reset Link
          </Link>
          <div className="text-center text-sm">
            <Link href="/login" className={`${theme === "dark" ? "text-green-300" : "text-green-800"} hover:underline`}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} className="space-y-6 w-full">
        <div className="text-center">
          <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-green-900"} mb-2`}>
            Reset Password
          </h2>
          <p className={`${theme === "dark" ? "text-slate-300" : "text-green-700"} text-sm mb-2`}>
            {email ? `Reset password for: ${email}` : "Enter a new password for your account."}
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
            placeholder="Enter new password (min. 8 characters)"
            minLength={8}
            disabled={success}
            required
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
            disabled={success}
            required
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
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className={`w-full ${theme === "dark" ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-gradient-to-r from-green-600 to-green-700"} text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200`}
            >
              Go to Sign In
            </button>
            <div className="text-center text-sm">
              <Link href="/login" className={`${theme === "dark" ? "text-green-300" : "text-green-800"} hover:underline`}>
                Or go to Sign In
              </Link>
            </div>
          </div>
        )}
        
        {!success && (
          <div className="text-center text-sm pt-4 border-t border-slate-700/30">
            <Link href="/forgot-password" className={`${theme === "dark" ? "text-green-300" : "text-green-800"} hover:underline`}>
              Request a new reset link
            </Link>
          </div>
        )}
      </form>
    </AuthCard>
  );
}