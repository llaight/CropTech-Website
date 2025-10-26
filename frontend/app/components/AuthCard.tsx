"use client";

import Image from "next/image";
import { useTheme } from "./ThemeProvider";

export default function AuthCard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <div className={`${theme === 'dark' ? 'bg-slate-800/90 border-slate-600/50' : 'bg-orange-50/90 border-green-300/50'} backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border`}>
      {/* Logo Section */}
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-20 h-20 ${theme === 'dark' ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-green-500 to-green-700'} rounded-2xl shadow-lg mb-4`}>
          <Image src="/ctlogo.png" alt="CropTech" width={48} height={48} className="rounded-lg" />
        </div>
        <h1 className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-green-900'} mb-2`}>
          Crop<span className={`${theme === 'dark' ? 'bg-gradient-to-r from-green-300 to-green-200' : 'bg-gradient-to-r from-green-600 to-green-500'} bg-clip-text text-transparent`}>Tech</span>
        </h1>
        <p className={`${theme === 'dark' ? 'text-slate-200' : 'text-green-800'} text-lg`}>Advanced Agricultural Platform</p>
      </div>

      {children}

      <div className="mt-8 text-center">
        <p className={`text-xs ${theme === 'dark' ? 'text-slate-200' : 'text-green-700'}`}>
          By creating an account, you agree to our{" "}
          <a href="#" className={`${theme === 'dark' ? 'text-green-300 hover:text-green-200' : 'text-green-800 hover:text-green-900'} transition-colors`}>Terms of Service</a>
          {" "}and{" "}
          <a href="#" className={`${theme === 'dark' ? 'text-green-300 hover:text-green-200' : 'text-green-800 hover:text-green-900'} transition-colors`}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}