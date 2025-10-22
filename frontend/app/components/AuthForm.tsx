"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  mode: "login" | "signup";
};

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("farmer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Backend API base (dev): the Flask app runs on port 5001 (see backend/run.py)
  const API_BASE = "http://localhost:5001/api";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email || !password || (mode === "signup" && !name)) {
      setMessage("Please fill required fields.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = { email, password };
      if (mode === "signup") {
        payload.name = name;
        payload.role = role;
      }

      const res = await fetch(`${API_BASE}/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.message || data?.msg || "An error occurred");
        setLoading(false);
        return;
      }

      if (mode === "login") {
        // backend returns { token, user }
        const token = data.token || data?.token;
        if (token) {
          // Note: for production consider using secure httpOnly cookies instead
          localStorage.setItem("token", token);
        }
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/");
      } else {
        // signup -> go to login page
        router.push("/login");
      }
    } catch (err: any) {
      setMessage(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md p-6 bg-white/60 dark:bg-black/50 rounded-md shadow-sm">
      <h2 className="text-2xl font-semibold mb-4 capitalize">{mode}</h2>

      {mode === "signup" && (
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Your full name"
          />
        </div>
      )}

      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="you@example.com"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="••••••••"
        />
      </div>

      {mode === "signup" && (
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border rounded">
            <option value="farmer">Farmer</option>
            <option value="buyer">Buyer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      )}

      {message && <div className="mb-3 text-sm text-red-600">{message}</div>}

      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60">
        {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
      </button>
    </form>
  );
}
