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
  const [resetLink, setResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setResetLink(null);

    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }

    // Basic email validation
    if (!email.includes('@')) {
      setMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    
    try {
      // CORRECTED: Added /api/ prefix to match the blueprint
      const response = await fetch("http://127.0.0.1:5001/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      // Check if response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setMessage(data.message);
      // In development mode, show the reset link
      if (data.dev_mode_link) {
        setResetLink(data.dev_mode_link);
      }
      
    } catch (error: any) {
      console.error("Fetch Error:", error);
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setMessage("Cannot connect to server. Make sure the backend is running on http://127.0.0.1:5001");
      } else {
        setMessage(error.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Test connection function
  const testConnection = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5001/api");
      console.log("Test connection response:", response.status);
      alert(`Backend is reachable. Status: ${response.status}`);
    } catch (error) {
      console.error("Test connection failed:", error);
      alert("Cannot connect to backend. Check if Flask server is running.");
    }
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
          
          {/* Test connection button - remove after debugging
          <button
            type="button"
            onClick={testConnection}
            className="mt-2 text-xs text-blue-500 hover:underline"
          >
            Test Backend Connection
          </button> */}
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
              required
            />
          </div>
        </div>

        {message && (
          <div className={`rounded-xl p-3 ${resetLink ? "bg-blue-500/10 border border-blue-500/20" : message.includes('error') || message.includes('Cannot connect') ? "bg-red-500/10 border border-red-500/20" : "bg-green-500/10 border border-green-500/20"}`}>
            <p className={`text-sm ${theme === "dark" ? "text-slate-200" : resetLink ? "text-blue-800" : message.includes('error') || message.includes('Cannot connect') ? "text-red-700" : "text-green-800"}`}>
              {message}
            </p>
            {resetLink && (
              <div className="mt-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Click the link below to reset your password:
                </p>
                <a 
                  href={resetLink} 
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {resetLink}
                </a>
              </div>
            )}
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