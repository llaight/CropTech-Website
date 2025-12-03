"use client";

import React, { useEffect, useState } from "react";
import BackButton from "@/app/components/BackButton";
import { useTheme } from "../components/ThemeProvider";
import { Icon } from "@iconify/react";

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
    <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white text-lg font-semibold">
      {initials || "U"}
    </div>
  );
}

export default function ProfilePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
    } catch {}
    try {
      const s = localStorage.getItem("settings");
      if (s) setSettings(JSON.parse(s));
    } catch {}
  }, []);

  function saveAccount() {
    const currentStoredPassword = (user as any)?.password || null;
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
      if (token) {
        fetch("http://localhost:5001/api/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ current_password: currentPass || null, new_password: newPass }),
        })
          .then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setMessage(data?.message || "Failed to change password");
              setTimeout(() => setMessage(null), 3500);
              return;
            }
            newUser.password = undefined;
            localStorage.setItem("user", JSON.stringify(newUser));
            setUser(newUser);
            setFormPassword("");
            setFormNewPassword("");
            setFormConfirmPassword("");
            setShowSavedPopup(true);
            setTimeout(() => setShowSavedPopup(false), 2500);
          })
          .catch(() => {
            setMessage("Network error while changing password");
            setTimeout(() => setMessage(null), 3500);
          });
      } else {
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

  // Container colors: light = white; dark = slate
  const cardClass =
    "rounded-xl shadow-sm border transition-colors " +
    (theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200");

  const mutedText = theme === "dark" ? "text-slate-300" : "text-slate-600";
  const headingText = theme === "dark" ? "text-white" : "text-slate-900";
  const inputClass =
    "mt-1 w-full px-3 py-2 rounded-md border bg-transparent " +
    (theme === "dark"
      ? "border-slate-700 text-slate-100 placeholder:text-slate-500"
      : "border-slate-300 text-slate-900 placeholder:text-slate-400");

  const dividerClass = theme === "dark" ? "my-4 border-slate-800" : "my-4 border-slate-200";

  return (
    <div className={`min-h-[calc(100dvh-4rem)] ${isDark ? "bg-slate-900" : "bg-white"} overflow-hidden`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Profile</h1>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Manage your account, settings and support options.</p>
          </div>
          <div>
            <BackButton className="hover:opacity-90" iconClassName={`${isDark ? "text-white" : "text-slate-900"}`} />
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className={`${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} rounded-xl shadow-sm border p-5 transition-colors`}>
            <div className="flex items-center gap-4">
              <Avatar name={user?.name} />
              <div>
                <h2 className={`text-lg font-semibold ${headingText}`}>{user?.name || "Unnamed User"}</h2>
                <p className={`text-sm ${mutedText}`}>{user?.role || "Role not set"}</p>
              </div>
            </div>

            <nav className="mt-5">
              <ul className="space-y-2">
                {[
                  { key: "account", label: "Account" },
                  { key: "settings", label: "Settings" },
                  { key: "support", label: "Support Chat" },
                  { key: "guide", label: "User Guide" },
                  { key: "share", label: "Share App" },
                ].map((item) => (
                  <li key={item.key}>
                    <button
                      onClick={() => setSelected(item.key as any)}
                      className={
                        "w-full text-left px-3 py-2 rounded-md transition-colors " +
                        (selected === item.key
                          ? (isDark
                              ? "bg-green-900/30 text-green-300"
                              : "bg-green-50 text-green-700")
                          : (isDark
                              ? "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                              : "text-slate-700 hover:bg-slate-50"))
                      }
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Right column */}
          <div className={`${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} rounded-xl shadow-sm border p-5 lg:col-span-2 transition-colors`}>
            {message && (
              <div className={`mb-4 text-sm ${theme === "dark" ? "text-green-300" : "text-green-700"}`}>{message}</div>
            )}
            {showSavedPopup && (
              <div className="fixed inset-0 z-[2000] flex items-end justify-center pointer-events-none">
                <div className="mb-8 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg pointer-events-auto">
                  Password saved
                </div>
              </div>
            )}

            {selected === "account" && (
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${headingText}`}>Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <div className={`text-sm font-medium ${headingText}`}>Full name</div>
                    <input value={formName} onChange={(e) => setFormName(e.target.value)} className={inputClass} />
                  </label>

                  <label className="block">
                    <div className={`text-sm font-medium ${headingText}`}>Email</div>
                    <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className={inputClass} />
                  </label>

                  <label className="block">
                    <div className={`text-sm font-medium ${headingText}`}>Role</div>
                    <input value={formRole} onChange={(e) => setFormRole(e.target.value)} placeholder="e.g., Farmer" className={inputClass} />
                  </label>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="block">
                      <div className={`text-sm font-medium ${headingText}`}>Current password</div>
                      <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className={inputClass} />
                    </label>

                    <label className="block">
                      <div className={`text-sm font-medium ${headingText}`}>New password</div>
                      <input type="password" value={formNewPassword} onChange={(e) => setFormNewPassword(e.target.value)} className={inputClass} />
                    </label>

                    <label className="block">
                      <div className={`text-sm font-medium ${headingText}`}>Confirm new password</div>
                      <input type="password" value={formConfirmPassword} onChange={(e) => setFormConfirmPassword(e.target.value)} className={inputClass} />
                    </label>
                  </div>

                  <div className="pt-2 md:col-span-2">
                    <button className="px-4 py-2 bg-green-600 text-white rounded-md" onClick={saveAccount}>
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selected === "settings" && (
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${headingText}`}>Settings</h3>

                <div className="mb-4">
                  <div className={`text-sm font-medium mb-2 ${headingText}`}>Unit system</div>
                  <label className={`inline-flex items-center mr-4 ${mutedText}`}>
                    <input
                      type="radio"
                      name="units"
                      checked={settings.units === "metric"}
                      onChange={() => setSettings({ ...settings, units: "metric" })}
                    />
                    <span className="ml-2">Metric — kg, ha, m/s, mm, C</span>
                  </label>
                  <label className={`flex items-center mt-3 ${mutedText}`}>
                    <input
                      type="radio"
                      name="units"
                      checked={settings.units === "imperial"}
                      onChange={() => setSettings({ ...settings, units: "imperial" })}
                    />
                    <span className="ml-2">Imperial — lb, ac, mph, in, F</span>
                  </label>
                </div>

                <hr className={dividerClass} />

                <div className="mb-4">
                  <div className={`text-sm font-medium mb-2 ${headingText}`}>Language</div>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value as "en" | "fil" })}
                    className={
                      "px-3 py-2 rounded-md border " +
                      (theme === "dark" ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900")
                    }
                  >
                    <option value="en">English</option>
                    <option value="fil">Filipino</option>
                  </select>
                </div>

                <hr className={dividerClass} />

                <div className="mb-4">
                  <a
                    href="/privacy"
                    className={`text-sm font-medium inline-block ${theme === "dark" ? "text-green-300" : "text-green-600"} hover:underline`}
                  >
                    Privacy Policy
                  </a>
                </div>

                <hr className={dividerClass} />

                <div className="mb-4">
                  <a
                    href="/terms"
                    className={`text-sm font-medium inline-block ${theme === "dark" ? "text-green-300" : "text-green-600"} hover:underline`}
                  >
                    Terms of Use
                  </a>
                </div>

                <div>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md" onClick={saveSettings}>
                    Save settings
                  </button>
                </div>
              </div>
            )}

            {selected === "support" && (
              <div>
                <h3 className={`text-lg font-semibold mb-2 ${headingText}`}>Support Chat</h3>
                <p className={`text-sm ${mutedText} mb-3`}>
                  Hi <span role="img" aria-label="wave">👋</span>
                </p>
                <p className={`text-sm ${mutedText} mb-4`}>Ask us anything or share your feedback!</p>
                <SupportChat userEmail={user?.email} theme={theme} />
              </div>
            )}

            {selected === "guide" && (
              <div>
                <h3 className={`text-lg font-semibold mb-2 ${headingText}`}>Handy Tips from CropTech team</h3>
                <p className={`text-sm ${mutedText} mb-4`}>Quick pointers to help you get the most out of CropTech.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {["General Info", "App features", "Account Settings", "Troubleshooting"].map((title) => (
                    <div
                      key={title}
                      className={
                        "border rounded-md p-4 " +
                        (theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white/80 border-slate-200")
                      }
                    >
                      <h4 className={`font-semibold mb-2 ${headingText}`}>{title}</h4>
                      <p className={`text-sm ${mutedText}`}>Placeholder content</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected === "share" && (
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${headingText}`}>Share CropTech</h3>
                <ShareApp theme={theme} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportChat({ userEmail, theme }: { userEmail?: string | null; theme: "light" | "dark" }) {
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
    } catch {}
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
    } catch {}
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages, storageKey]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: Date.now(), sender: "user", text, time: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");

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
    <div className={theme === "dark" ? "border border-slate-800 rounded-md p-4 bg-slate-900" : "border rounded-md p-4 bg-white/70"}>
      <div
        ref={containerRef}
        className={
          "h-64 overflow-y-auto p-2 rounded-md space-y-3 " +
          (theme === "dark" ? "bg-slate-800" : "bg-slate-50")
        }
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={
                `${msg.sender === "user"
                  ? "bg-green-600 text-white"
                  : theme === "dark"
                    ? "bg-slate-900 text-slate-100 border border-slate-800"
                    : "bg-white text-slate-800 border"} max-w-[80%] px-3 py-2 rounded-lg shadow-sm`
              }
            >
              <div className="text-sm">{msg.text}</div>
              <div className="text-xs text-slate-400 mt-1">{new Date(msg.time).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className={
            "flex-1 px-3 py-2 rounded-md border " +
            (theme === "dark" ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900")
          }
          placeholder="Type your message..."
        />
        <button className="px-4 py-2 bg-green-600 text-white rounded-md" onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

function ShareApp({ theme }: { theme: "light" | "dark" }) {
  const [toast, setToast] = useState<string | null>(null);
  const url = (typeof window !== "undefined" && window.location.origin) ? `${window.location.origin}` : "https://croptech.example";

  async function copyLink() {
    try {
      const full = typeof window !== "undefined" ? window.location.href : url;
      await navigator.clipboard.writeText(full);
      setToast("Link copied to clipboard");
      setTimeout(() => setToast(null), 2200);
    } catch {
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
    } catch {
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
    <div className={theme === "dark" ? "border border-slate-800 rounded-md p-4 bg-slate-900" : "border rounded-md p-4 bg-white/70"}>
      <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"} mb-3`}>
        Share CropTech with friends, farmers, and colleagues. Quickly copy the link or use a sharing app on your device.
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2 mb-3">
        <button
          onClick={copyLink}
          className={
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-md " +
            (theme === "dark"
              ? "bg-slate-800 text-slate-100 border border-slate-700"
              : "bg-slate-100 text-slate-800 border")
          }
        >
          <Icon icon="material-symbols:link" className="w-5 h-5" />
          <span className="hidden sm:inline">Copy link</span><span className="sm:hidden">Copy</span>
        </button>
        <button
          onClick={nativeShare}
          className={
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-md " +
            (theme === "dark" ? "bg-slate-800 text-slate-100 border border-slate-700" : "bg-slate-100 text-slate-800 border")
          }
        >
          <Icon icon="material-symbols:share-outline" className="w-5 h-5" />
          <span className="hidden sm:inline">Native share</span><span className="sm:hidden">Share</span>
        </button>
      </div>

      <hr className={theme === "dark" ? "my-4 border-slate-800" : "my-4 border-slate-200"} />

      <div className="mt-2 flex flex-wrap gap-2 mb-2">
        <button
          onClick={() => openSocial("whatsapp")}
          className={
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm md:text-base rounded-md box-border " +
            (theme === "dark"
              ? "bg-green-600 hover:bg-green-500 text-white border border-slate-700"
              : "bg-green-500 hover:bg-green-600 text-white border border-transparent")
          }
        >
          <Icon icon="ri:whatsapp-fill" className="w-5 h-5" />
          WhatsApp
        </button>

        <button
          onClick={() => openSocial("twitter")}
          className={
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm md:text-base rounded-md box-border " +
            (theme === "dark"
              ? "bg-black hover:bg-neutral-900 text-white border border-slate-700"
              : "bg-black hover:bg-neutral-800 text-white border border-transparent")
          }
        >
          <Icon icon="prime:twitter" className="w-4 h-4" />
          Twitter
        </button>

        <button
          onClick={() => openSocial("facebook")}
          className={
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm md:text-base rounded-md box-border " +
            (theme === "dark"
              ? "bg-blue-600 hover:bg-blue-500 text-white border border-slate-700"
              : "bg-blue-700 hover:bg-blue-600 text-white border border-transparent")
          }
        >
          <Icon icon="ic:baseline-facebook" className="w-5 h-5" />
          Facebook
        </button>
      </div>

      <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} mt-3`}>
        Sharing opens a new window or uses your device's native share when available.
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div className="bg-black/80 text-white px-4 py-2 rounded-md shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  );
}
