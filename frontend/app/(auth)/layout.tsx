import React from "react";
import AuthBackground from "../components/AuthBackground";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthBackground>
      {/* Add vertical padding so the card doesn't stick to top/bottom */}
      <div className="min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-md w-full">
          {children}
        </div>
      </div>
    </AuthBackground>
  );
}