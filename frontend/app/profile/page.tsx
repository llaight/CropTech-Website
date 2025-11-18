"use client";

import React, { useEffect, useState } from "react";

type User = { id?: number; name?: string; email?: string; role?: string } | null;
type Settings = { units: "metric" | "imperial"; language: "en" | "fil" };

function Avatar({ name }: { name?: string }) {
  const initials = (name || "")
    .split(" ")
    .map((s) => s.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center text-white text-xl font-semibold">
      {initials || "U"}
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState<User>(null);
  const [selected, setSelected] = useState<"account" | "settings" | "support" | "guide" | "share">("account");
  const [message, setMessage] = useState<string | null>(null);
    const [showSavedPopup, setShowSavedPopup] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formNewPassword, setFormNewPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");

  const [settings, setSettings] = useState<Settings>({ units: "metric", language: "en" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        setFormName(parsed.name || "");
        setFormEmail(parsed.email || "");
        setFormRole(parsed.role || "");
      }
    } catch (e) {
      // ignore
    }

    try {
      const s = localStorage.getItem("settings");
      if (s) setSettings(JSON.parse(s));
    } catch (e) {}
  }, []);

  function saveAccount() {
    // Basic client-side password change handling (demo only).
    // NOTE: Storing passwords in localStorage is insecure. In production,
    // password changes should be sent to the backend and stored hashed.
    const currentStoredPassword = (user as any)?.password || null;

    // Trim inputs to avoid accidental whitespace issues
    const newPass = formNewPassword.trim();
    const confirmPass = formConfirmPassword.trim();
    const currentPass = formPassword.trim();

    if (newPass || confirmPass) {
      if (!newPass || !confirmPass) {
        setMessage("Please fill both New password and Confirm password fields");
        setTimeout(() => setMessage(null), 3500);
        return;
      }

      if (newPass !== confirmPass) {
        setMessage("New password and confirm password do not match");
        setTimeout(() => setMessage(null), 3500);
        return;
      }

      // If a stored password exists, require the current password to be provided and match.
      if (currentStoredPassword) {
        if (!currentPass) {
          setMessage("Please enter your current password to change it");
          setTimeout(() => setMessage(null), 3500);
          return;
        }

        if (currentPass !== currentStoredPassword) {
          setMessage("Current password is incorrect");
          setTimeout(() => setMessage(null), 3500);
          return;
        }
      }
    }

    const newUser: any = { ...(user || {}), name: formName.trim(), email: formEmail.trim(), role: formRole.trim() };
    if (newPass) {
      const token = localStorage.getItem("token");

      // If token exists, call backend change-password endpoint
      if (token) {
        fetch("http://localhost:5001/api/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ current_password: currentPass || null, new_password: newPass }),
        })
          .then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setMessage(data?.message || "Failed to change password");
              setTimeout(() => setMessage(null), 3500);
              return;
            }

            // Success from backend
            newUser.password = undefined; // don't store raw password locally
            localStorage.setItem("user", JSON.stringify(newUser));
            setUser(newUser);
            setFormPassword("");
            setFormNewPassword("");
            setFormConfirmPassword("");
            // show confirmation popup
            setShowSavedPopup(true);
            setTimeout(() => setShowSavedPopup(false), 2500);
          })
          .catch((err) => {
            setMessage("Network error while changing password");
            setTimeout(() => setMessage(null), 3500);
          });
      } else {
        // No token: fallback to demo localStorage behavior
        newUser.password = newPass;
        setFormPassword("");
        setFormNewPassword("");
        setFormConfirmPassword("");
        localStorage.setItem("user", JSON.stringify(newUser));
        setUser(newUser);
        setShowSavedPopup(true);
        setTimeout(() => setShowSavedPopup(false), 2500);
      }
    } else {
      // No password changes, just update basic profile fields
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);
      setMessage("Account updated");
      setTimeout(() => setMessage(null), 2500);
    }
  }

  function saveSettings() {
    localStorage.setItem("settings", JSON.stringify(settings));
    setMessage("Settings saved");
    setTimeout(() => setMessage(null), 2500);
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="mt-2 text-sm text-slate-600">Manage your account, settings and support options.</p>
          </div>
          <div>
            <a
              href="/"
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-green-600 transition-colors rounded-md"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column: profile card & nav */}
          <div className="col-span-1 bg-white/80 dark:bg-slate-900 p-6 rounded-xl shadow">
            <div className="flex flex-col items-center">
              <Avatar name={user?.name} />
              <h2 className="mt-3 text-lg font-semibold">{user?.name || "Unnamed User"}</h2>
              <p className="text-sm text-slate-500">{user?.role || "Role not set"}</p>
            </div>

            <nav className="mt-6">
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => setSelected("account")}
                    className={`w-full text-left px-3 py-2 rounded-md ${selected === "account" ? "bg-green-50 text-green-700" : "hover:bg-slate-50"}`}>
                    Account
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setSelected("settings")}
                    className={`w-full text-left px-3 py-2 rounded-md ${selected === "settings" ? "bg-green-50 text-green-700" : "hover:bg-slate-50"}`}>
                    Settings
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setSelected("support")}
                    className={`w-full text-left px-3 py-2 rounded-md ${selected === "support" ? "bg-green-50 text-green-700" : "hover:bg-slate-50"}`}>
                    Support Chat
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setSelected("guide")}
                    className={`w-full text-left px-3 py-2 rounded-md ${selected === "guide" ? "bg-green-50 text-green-700" : "hover:bg-slate-50"}`}>
                    User Guide
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setSelected("share")}
                    className={`w-full text-left px-3 py-2 rounded-md ${selected === "share" ? "bg-green-50 text-green-700" : "hover:bg-slate-50"}`}>
                    Share App
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Right column: content */}
          <div className="col-span-2 bg-white/80 dark:bg-slate-900 p-6 rounded-xl shadow">
            {message && <div className="mb-4 text-sm text-green-700">{message}</div>}
            {showSavedPopup && (
              <div className="fixed inset-0 z-[2000] flex items-end justify-center pointer-events-none">
                <div className="mb-8 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg pointer-events-auto">
                  Password saved
                </div>
              </div>
            )}

            {selected === "account" && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Account</h3>
                <div className="grid grid-cols-1 gap-4">
                  <label className="block">
                    <div className="text-sm font-medium">Full name</div>
                    <input value={formName} onChange={(e) => setFormName(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
                  </label>

                  <label className="block">
                    <div className="text-sm font-medium">Email</div>
                    <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
                  </label>

                  <label className="block">
                    <div className="text-sm font-medium">Role</div>
                    <input value={formRole} onChange={(e) => setFormRole(e.target.value)} placeholder="e.g., Farmer" className="mt-1 w-full px-3 py-2 border rounded-md" />
                  </label>

                  <label className="block">
                    <div className="text-sm font-medium">Current password</div>
                    <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
                  </label>

                  <label className="block">
                    <div className="text-sm font-medium">New password</div>
                    <input type="password" value={formNewPassword} onChange={(e) => setFormNewPassword(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
                  </label>

                  <label className="block">
                    <div className="text-sm font-medium">Confirm new password</div>
                    <input type="password" value={formConfirmPassword} onChange={(e) => setFormConfirmPassword(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
                  </label>

                  <div className="pt-2">
                    <button onClick={saveAccount} className="px-4 py-2 bg-green-600 text-white rounded-md">Save Changes</button>
                  </div>
                </div>
              </div>
            )}

            {selected === "settings" && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Settings</h3>

                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Unit system</div>
                  <label className="inline-flex items-center mr-4">
                    <input type="radio" name="units" checked={settings.units === "metric"} onChange={() => setSettings({ ...settings, units: "metric" })} />
                    <span className="ml-2">Metric — kg, ha, m/s, mm, C</span>
                  </label>
                  <label className="flex items-center mt-3">
                    <input type="radio" name="units" checked={settings.units === "imperial"} onChange={() => setSettings({ ...settings, units: "imperial" })} />
                    <span className="ml-2">Imperial — lb, ac, mph, in, F</span>
                  </label>
                </div>

                <hr className="my-4 border-slate-200" />
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Language</div>
                  <select value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value as "en" | "fil" })} className="px-3 py-2 border rounded-md">
                    <option value="en">English</option>
                    <option value="fil">Filipino</option>
                  </select>
                </div>

                <hr className="my-4 border-slate-200" />
                <div className="mb-4">
                  <a href="/privacy" className="text-sm font-medium mb-2 text-green-600 hover:underline inline-block">Privacy Policy</a>
                </div>

                <hr className="my-4 border-slate-200" />
                <div className="mb-4">
                  <a href="/terms" className="text-sm font-medium mb-2 text-green-600 hover:underline inline-block">Terms of Use</a>
                </div>

                <div>
                  <button onClick={saveSettings} className="px-4 py-2 bg-green-600 text-white rounded-md">Save settings</button>
                </div>
              </div>
            )}

            {selected === "support" && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Support Chat</h3>
                <p className="text-sm text-slate-600 mb-3">Hi <span role="img" aria-label="wave">👋</span></p>
                <p className="text-sm text-slate-600 mb-4">Ask us anything or share your feedback!</p>

                <SupportChat userEmail={user?.email} />
              </div>
            )}

            {selected === "guide" && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Handy Tips from CropTech team</h3>
                <p className="text-sm text-slate-600 mb-4">Quick pointers to help you get the most out of CropTech.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-md p-4 bg-white/80">
                    <h4 className="font-semibold mb-2">General Info</h4>
                    <p className="text-sm text-slate-600">Overview, getting started, and basic concepts.</p>
                  </div>

                  <div className="border rounded-md p-4 bg-white/80">
                    <h4 className="font-semibold mb-2">App features</h4>
                    <p className="text-sm text-slate-600">Highlights of the main features and how to use them.</p>
                  </div>

                  <div className="border rounded-md p-4 bg-white/80">
                    <h4 className="font-semibold mb-2">Account Settings</h4>
                    <p className="text-sm text-slate-600">Manage your profile, password, and preferences.</p>
                  </div>

                  <div className="border rounded-md p-4 bg-white/80">
                    <h4 className="font-semibold mb-2">Troubleshooting</h4>
                    <p className="text-sm text-slate-600">Common problems and quick fixes.</p>
                  </div>
                </div>
              </div>
            )}

            {selected === "share" && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Share CropTech</h3>
                <ShareApp />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportChat({ userEmail }: { userEmail?: string | null }) {
  type ChatMessage = { id: number; sender: "team" | "user"; text: string; time: number };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const storageKey = `supportChat:${userEmail || "anonymous"}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setMessages(JSON.parse(raw));
        return;
      }
    } catch (e) {}

    // default preview message from CropTech team
    const welcome: ChatMessage = {
      id: Date.now(),
      sender: "team",
      text: "Hi! Welcome to CropTech support — how can we help you today?",
      time: Date.now(),
    };
    setMessages([welcome]);
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {}
    // scroll to bottom
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, storageKey]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: Date.now(), sender: "user", text, time: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    // simulated team reply
    setTimeout(() => {
      const reply: ChatMessage = {
        id: Date.now() + 1,
        sender: "team",
        text: "Thanks for reaching out — a member of our team will reply shortly.",
        time: Date.now(),
      };
      setMessages((m) => [...m, reply]);
    }, 900);
  }

  return (
    <div className="border rounded-md p-4 bg-white/70">
      <div ref={containerRef} className="h-64 overflow-y-auto p-2 space-y-3 bg-slate-50 rounded-md">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`${msg.sender === "user" ? "bg-green-600 text-white" : "bg-white text-slate-800 border"} max-w-[80%] px-3 py-2 rounded-lg shadow-sm`}>
              <div className="text-sm">{msg.text}</div>
              <div className="text-xs text-slate-400 mt-1">{new Date(msg.time).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} className="flex-1 px-3 py-2 border rounded-md" placeholder="Type your message..." />
        <button onClick={sendMessage} className="px-4 py-2 bg-green-600 text-white rounded-md">Send</button>
      </div>
    </div>
  );
}

function ShareApp() {
  const [toast, setToast] = useState<string | null>(null);
  const url = (typeof window !== "undefined" && window.location.origin) ? `${window.location.origin}` : "https://croptech.example";

  async function copyLink() {
    try {
      const full = typeof window !== "undefined" ? window.location.href : url;
      await navigator.clipboard.writeText(full);
      setToast("Link copied to clipboard");
      setTimeout(() => setToast(null), 2200);
    } catch (e) {
      setToast("Unable to copy link");
      setTimeout(() => setToast(null), 2200);
    }
  }

  async function nativeShare() {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: "CropTech", text: `Check out CropTech — helpful tools for farmers`, url });
        setToast("Shared successfully");
        setTimeout(() => setToast(null), 2200);
        return;
      }
      setToast("Share not supported on this device");
      setTimeout(() => setToast(null), 2200);
    } catch (e) {
      setToast("Share failed");
      setTimeout(() => setToast(null), 2200);
    }
  }

  function openSocial(platform: string) {
    const link = typeof window !== "undefined" ? window.location.href : url;
    const text = encodeURIComponent(`Check out CropTech: ${link}`);
    let href = "";
    if (platform === "whatsapp") href = `https://wa.me/?text=${text}`;
    if (platform === "twitter") href = `https://twitter.com/intent/tweet?text=${text}`;
    if (platform === "facebook") href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="border rounded-md p-4 bg-white/70">
      <p className="text-sm text-slate-600 mb-3">Share CropTech with friends, farmers, and colleagues. Quickly copy the link or use a sharing app on your device.</p>

      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2 mb-3">
        <button onClick={copyLink} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md shadow">📋 <span className="hidden sm:inline">Copy link</span><span className="sm:hidden">Copy</span></button>
        <button onClick={nativeShare} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 border rounded-md">🔗 <span className="hidden sm:inline">Native share</span><span className="sm:hidden">Share</span></button>
      </div>

      <hr className="my-4 border-slate-200" />

      <div className="mt-2 flex flex-wrap gap-2 mb-2">
        <button onClick={() => openSocial("whatsapp")} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-md">💬 WhatsApp</button>
        <button onClick={() => openSocial("twitter")} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-400 text-white rounded-md">🐦 Twitter</button>
        <button onClick={() => openSocial("facebook")} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-700 text-white rounded-md">📘 Facebook</button>
      </div>

      <div className="text-xs text-slate-500 mt-3">Sharing opens a new window or uses your device's native share when available.</div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div className="bg-black/80 text-white px-4 py-2 rounded-md shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  );
}
