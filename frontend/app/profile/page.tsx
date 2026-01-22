"use client";

import React, { useEffect, useState } from "react";
import BackButton from "@/app/components/BackButton";
import { useTheme } from "../components/ThemeProvider";
import { Icon } from "@iconify/react";

type User = { id?: number; name?: string; email?: string; role?: string } | null;
type Settings = { units: "metric" | "imperial" };

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
  const [selected, setSelected] = useState<"account" | "settings" | "guide" | "share" | "security">("account");
  const [message, setMessage] = useState<string | null>(null);
  const [showSavedPopup, setShowSavedPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("farmer");
  const [formPassword, setFormPassword] = useState("");
  const [formNewPassword, setFormNewPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");

  const [settings, setSettings] = useState<Settings>({ units: "metric" });
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: "30",
    saveLogin: false,
  });

  // Load user data, settings, and security settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        setFormName(parsed.name || "");
        setFormEmail(parsed.email || "");
        setFormRole(parsed.role || "farmer");
      }
    } catch {}
    
    try {
      const s = localStorage.getItem("settings");
      if (s) setSettings(JSON.parse(s));
    } catch {}
    
    // Fetch security settings from backend
    fetchSecuritySettings();
  }, []);

  // Fetch security settings from backend
  const fetchSecuritySettings = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch("http://localhost:5001/api/security-settings", {
        method: "GET",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSecuritySettings({
          sessionTimeout: data.security?.sessionTimeout?.toString() || "30",
          saveLogin: data.security?.saveLogin || false,
        });
      }
    } catch (error) {
      console.error("Error fetching security settings:", error);
    }
  };

  // Save security settings to backend
  const saveSecuritySettings = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("Please log in to save security settings");
      setTimeout(() => setMessage(null), 3500);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5001/api/security-settings", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          sessionTimeout: parseInt(securitySettings.sessionTimeout),
          saveLogin: securitySettings.saveLogin,
        }),
      });

      if (response.ok) {
        setMessage("Security settings saved successfully");
        setTimeout(() => setMessage(null), 2500);
      } else {
        const error = await response.json();
        setMessage(error.message || "Failed to save security settings");
        setTimeout(() => setMessage(null), 3500);
      }
    } catch (error) {
      setMessage("Network error while saving security settings");
      setTimeout(() => setMessage(null), 3500);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to download PDF
  const downloadPDF = async () => {
    setPdfDownloading(true);
    try {
      // Try to download from the backend API first
      const response = await fetch("http://localhost:5001/api/download-user-guide");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "CropTech_User_Manual.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setMessage("PDF download started");
        setTimeout(() => setMessage(null), 2500);
      } else {
        // If backend fails, try the direct public folder approach
        window.open("/CropTech User Manual.pdf", "_blank");
        setMessage("Opening PDF in new tab");
        setTimeout(() => setMessage(null), 2500);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      setMessage("Failed to download PDF. Please try again.");
      setTimeout(() => setMessage(null), 3500);
    } finally {
      setPdfDownloading(false);
    }
  };

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

    const newUser: any = { ...(user || {}), name: formName.trim(), email: formEmail.trim(), role: "farmer" };
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
            <h1 className={`text-2xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Profile & Settings</h1>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Manage your account, preferences, and app settings.</p>
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
                <p className={`text-sm ${mutedText}`}>{user?.role || "Farmer"}</p>
                <p className={`text-xs ${mutedText} mt-1`}>{user?.email || ""}</p>
              </div>
            </div>

            <nav className="mt-5">
              <ul className="space-y-2">
                {[
                  { key: "account", label: "Account", icon: "mdi:account-outline" },
                  { key: "settings", label: "App Settings", icon: "mdi:cog-outline" },
                  { key: "security", label: "Security", icon: "mdi:shield-outline" },
                  { key: "guide", label: "User Guide", icon: "mdi:book-open-outline" },
                  { key: "share", label: "Share App", icon: "mdi:share-variant-outline" },
                ].map((item) => (
                  <li key={item.key}>
                    <button
                      onClick={() => setSelected(item.key as any)}
                      className={
                        "w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 " +
                        (selected === item.key
                          ? (isDark
                              ? "bg-green-900/30 text-green-300"
                              : "bg-green-50 text-green-700")
                          : (isDark
                              ? "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                              : "text-slate-700 hover:bg-slate-50"))
                      }
                    >
                      <Icon icon={item.icon} className="w-5 h-5" />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Account Status</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${user ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {user ? 'Account Active' : 'Not Logged In'}
                </span>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className={`${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} rounded-xl shadow-sm border p-5 lg:col-span-2 transition-colors min-h-[500px]`}>
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
                <h3 className={`text-lg font-semibold mb-4 ${headingText}`}>Account Information</h3>
                <p className={`text-sm ${mutedText} mb-4`}>Update your personal information and password.</p>
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
                    <input 
                      value={formRole} 
                      readOnly 
                      className={`mt-1 w-full px-3 py-2 rounded-md border ${theme === "dark" ? "bg-slate-800 text-slate-100 border-slate-700" : "bg-gray-100 border-slate-300 text-slate-900"} cursor-not-allowed`}
                      title="Role is fixed to Farmer"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Role is fixed to Farmer</p>
                  </label>

                  <div className="md:col-span-2 mt-2">
                    <h4 className={`text-md font-medium mb-3 ${headingText}`}>Change Password</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </div>

                  <div className="pt-2 md:col-span-2 flex gap-3">
                    <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors" onClick={saveAccount}>
                      Save Changes
                    </button>
                    <button className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => {
                      setFormName(user?.name || "");
                      setFormEmail(user?.email || "");
                      setFormRole("farmer");
                      setFormPassword("");
                      setFormNewPassword("");
                      setFormConfirmPassword("");
                    }}>
                      Reset to Default
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selected === "settings" && (
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${headingText}`}>Application Settings</h3>
                <p className={`text-sm ${mutedText} mb-4`}>Customize your CropTech experience.</p>

                <div className="mb-4">
                  <div className={`text-sm font-medium mb-2 ${headingText}`}>Unit System</div>
                  <div className="space-y-2">
                    <label className={`flex items-center ${mutedText}`}>
                      <input
                        type="radio"
                        name="units"
                        checked={settings.units === "metric"}
                        onChange={() => setSettings({ units: "metric" })}
                        className="mr-2"
                      />
                      <span>Metric — kg, ha, m/s, mm, °C</span>
                    </label>
                    <label className={`flex items-center ${mutedText}`}>
                      <input
                        type="radio"
                        name="units"
                        checked={settings.units === "imperial"}
                        onChange={() => setSettings({ units: "imperial" })}
                        className="mr-2"
                      />
                      <span>Imperial — lb, ac, mph, in, °F</span>
                    </label>
                  </div>
                </div>

                <hr className={dividerClass} />

                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors" onClick={saveSettings}>
                    Save Settings
                  </button>
                  <button className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => {
                    setSettings({ units: "metric" });
                  }}>
                    Reset to Defaults
                  </button>
                </div>
              </div>
            )}

            {selected === "security" && (
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${headingText}`}>Security Settings</h3>
                <p className={`text-sm ${mutedText} mb-4`}>Manage your account security and privacy.</p>

                <div className="space-y-6">
                  <div>
                    <div className={`text-sm font-medium mb-2 ${headingText}`}>Session Timeout</div>
                    <select
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                      className={
                        "w-full md:w-64 px-3 py-2 rounded-md border " +
                        (theme === "dark" ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900")
                      }
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                      <option value="0">Never (not recommended)</option>
                    </select>
                    <div className={`text-xs ${mutedText} mt-1`}>Automatically log out after inactivity</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-sm font-medium ${headingText}`}>Save Login</div>
                      <div className={`text-xs ${mutedText}`}>Keep me logged in on this device</div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={securitySettings.saveLogin}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, saveLogin: e.target.checked })}
                        className="sr-only"
                        id="toggle-save-login"
                      />
                      <label
                        htmlFor="toggle-save-login"
                        className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${securitySettings.saveLogin ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${securitySettings.saveLogin ? 'transform translate-x-6' : ''}`}></span>
                      </label>
                    </div>
                  </div>
                </div>

                <hr className={dividerClass} />

                <div className="flex gap-3">
                  <button 
                    className={`px-4 py-2 ${isLoading ? 'bg-green-500' : 'bg-green-600'} text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2`} 
                    onClick={saveSecuritySettings}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : 'Save Security Settings'}
                  </button>
                  <button className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => {
                    setSecuritySettings({
                      sessionTimeout: "30",
                      saveLogin: false,
                    });
                  }}>
                    Reset to Defaults
                  </button>
                </div>
              </div>
            )}

            {selected === "guide" && (
              <div className="flex flex-col h-full max-h-[calc(100vh-250px)]">
                <h3 className={`text-lg font-semibold mb-4 ${headingText}`}>CropTech User Guide</h3>
                <p className={`text-sm ${mutedText} mb-4`}>Learn how to make the most of CropTech with these helpful resources.</p>

                {/* Download PDF Button */}
                <div className="mb-4 p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className={`font-semibold mb-1 ${theme === "dark" ? "text-green-300" : "text-green-700"}`}>Complete User Manual</h4>
                      <p className={`text-sm ${theme === "dark" ? "text-green-200" : "text-green-600"}`}>
                        Download the full user manual for detailed instructions on all features.
                      </p>
                    </div>
                    <button
                      onClick={downloadPDF}
                      disabled={pdfDownloading}
                      className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2 sm:w-auto w-full disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {pdfDownloading ? (
                        <>
                          <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Icon icon="mdi:download" className="w-4 h-4" />
                          Download PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Scrollable User Guide Content - Fixed height with proper scrolling */}
                <div className="flex-grow overflow-hidden border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="h-full overflow-y-auto p-4">
                    <div className="space-y-6">
                      <section>
                        <h4 className={`text-md font-semibold mb-2 ${headingText}`}>1. Introduction</h4>
                        <div className={`text-sm ${mutedText}`}>
                          <p className="mb-2">CropTech is a web-based agricultural management system designed to support rice farmers and agricultural managers by providing tools for:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Field and land tracking</li>
                            <li>Inventory management</li>
                            <li>Agricultural data analytics</li>
                            <li>Real-time and historical data visualization</li>
                          </ul>
                        </div>
                      </section>

                      <section>
                        <h4 className={`text-md font-semibold mb-2 ${headingText}`}>2. Getting Started</h4>
                        <div className={`text-sm ${mutedText}`}>
                          <p className="mb-2"><strong>Accessing the System:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Open a supported web browser (Chrome, Firefox, Edge)</li>
                            <li>Enter the CropTech website URL</li>
                            <li>The Landing Page will appear with login/registration options</li>
                          </ol>
                        </div>
                      </section>

                      <section>
                        <h4 className={`text-md font-semibold mb-2 ${headingText}`}>3. User Account Management</h4>
                        <div className={`text-sm ${mutedText}`}>
                          <p className="mb-2"><strong>Creating a New Account:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>From the Landing Page, click Create Account</li>
                            <li>Enter your full name, email address, and password</li>
                            <li>Click Sign Up</li>
                          </ol>
                          
                          <p className="mt-3 mb-2"><strong>Logging In:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Click Log In on the Landing Page</li>
                            <li>Enter your registered email and password</li>
                            <li>Click Log In to access the Dashboard</li>
                          </ol>
                        </div>
                      </section>

                      <section>
                        <h4 className={`text-md font-semibold mb-2 ${headingText}`}>4. System Navigation</h4>
                        <div className={`text-sm ${mutedText}`}>
                          <p className="mb-2">The Dashboard is the central hub of the application with:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Key Metrics:</strong> Total Fields, Active Crops, Harvest Yield, and Revenue</li>
                            <li><strong>Quick Actions:</strong> Manage Fields, Check Inventory, View Analytics</li>
                            <li><strong>Recent Activity:</strong> Log of recent events</li>
                          </ul>
                          <p className="mt-2">Use the collapsible side navigation bar to access all modules.</p>
                        </div>
                      </section>

                      <section>
                        <h4 className={`text-md font-semibold mb-2 ${headingText}`}>5. Theme Customization</h4>
                        <div className={`text-sm ${mutedText}`}>
                          <p>Customize the appearance of the application:</p>
                          <ol className="list-decimal pl-5 space-y-1 mt-1">
                            <li>Locate the Theme Toggle switch in the top header bar</li>
                            <li>Click the toggle to switch between White Mode (Light) and Dark Mode</li>
                          </ol>
                        </div>
                      </section>

                      <section>
                        <h4 className={`text-md font-semibold mb-2 ${headingText}`}>6. Fields Page (Land Tracker)</h4>
                        <div className={`text-sm ${mutedText}`}>
                          <p className="mb-2">Manage your land with the Fields page:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>View all registered fields on an interactive map with pins</li>
                            <li>Use the search bar to find locations</li>
                            <li>Add fields by clicking 4 points to define boundaries</li>
                            <li>View field details: Field ID, Location, Weather, Crop Info, Calendar</li>
                            <li>Track farm events: Watered, Fertilizer, Pesticide, or Typhoon</li>
                            <li>Record harvests with actual dates and yields</li>
                            <li>View harvest history for each field</li>
                          </ul>
                        </div>
                      </section>

                      <section>
                        <h4 className={`text-md font-semibold mb-2 ${headingText}`}>7. Inventory Module</h4>
                        <div className={`text-sm ${mutedText}`}>
                          <p className="mb-2"><strong>Rice Varieties:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>View list of varieties with Name, Unit, Price, Condition</li>
                            <li>Add new rice varieties with detailed inventory counts</li>
                            <li>Manage varieties: edit, delete, or export PDF reports</li>
                          </ul>
                          
                          <p className="mt-3 mb-2"><strong>Deliveries:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Track deliveries by status: Upcoming, Pending, Completed, Cancelled</li>
                            <li>Add new deliveries with date, time, recipient, destination</li>
                            <li>Select delivery method (Delivery/Pick-up) and status</li>
                            <li>Manage delivery items with variety, sack size, and count</li>
                          </ul>
                        </div>
                      </section>

                      <section>
                        <h4 className={`text-md font-semibold mb-2 ${headingText}`}>8. Analytics Module</h4>
                        <div className={`text-sm ${mutedText}`}>
                          <p>View comprehensive insights including:</p>
                          <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li><strong>Performance:</strong> Total Revenue, Yield, Varieties, and Fields</li>
                            <li><strong>Trends:</strong> Market Price, Historical Sales, Yield Trends charts</li>
                            <li><strong>Crop Health:</strong> High-performing crops and Rice Variant Performance</li>
                            <li><strong>Insights:</strong> Actionable recommendations for crop management</li>
                            <li><strong>Environment:</strong> Field Distribution and 5-day Weather Forecast</li>
                          </ul>
                        </div>
                      </section>

                      <section>
                        <h4 className={`text-md font-semibold mb-2 ${headingText}`}>9. User Profile & Settings</h4>
                        <div className={`text-sm ${mutedText}`}>
                          <p>Manage your account and preferences:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Account:</strong> Edit personal information and change password</li>
                            <li><strong>App Settings:</strong> Select unit system (Metric or Imperial)</li>
                            <li><strong>Security:</strong> Configure session timeout and save login preferences</li>
                            <li><strong>User Guide:</strong> View documentation and download manual</li>
                            <li><strong>Share App:</strong> Copy link or share to social media</li>
                          </ul>
                        </div>
                      </section>

                      <section>
                        <h4 className={`text-md font-semibold mb-2 ${headingText}`}>10. Security Features</h4>
                        <div className={`text-sm ${mutedText}`}>
                          <p>CropTech includes multiple security features:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Secure login and authentication</li>
                            <li>Protected user sessions</li>
                            <li>Backend validation for all data operations</li>
                            <li>Session timeout controls</li>
                          </ul>
                          <p className="mt-2"><strong>Security Tip:</strong> Always log out after using the system, especially when accessing from shared devices.</p>
                        </div>
                      </section>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                  <p className={`text-sm ${mutedText}`}>
                    For additional help, contact support at{" "}
                    <a href="mailto:support@croptech.com" className="text-green-600 dark:text-green-400 hover:underline">
                      support@croptech.com
                    </a>
                  </p>
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
              ? "bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700"
              : "bg-slate-100 text-slate-800 border hover:bg-slate-200")
          }
        >
          <Icon icon="material-symbols:link" className="w-5 h-5" />
          <span className="hidden sm:inline">Copy link</span><span className="sm:hidden">Copy</span>
        </button>
        <button
          onClick={nativeShare}
          className={
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-md " +
            (theme === "dark" ? "bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700" : "bg-slate-100 text-slate-800 border hover:bg-slate-200")
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