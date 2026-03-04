import React from "react";
import { LogOut, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const LanguageToggle = ({ onLanguageChange }) => {
  const { language, setLanguage } = useLanguage();
  const handleSet = (lang) => {
    setLanguage(lang);
    onLanguageChange?.(lang);
  };
  
  return (
    <div className="flex items-center bg-slate-50 border border-slate-100 p-1 rounded-full gap-1">
      <button
        type="button"
        onClick={() => handleSet("en")}
        className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase transition-all ${
          language === "en"
            ? "bg-white text-blue-600 shadow-sm border border-slate-100"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => handleSet("ka")}
        className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase transition-all ${
          language === "ka"
            ? "bg-white text-blue-600 shadow-sm border border-slate-100"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        ქარ
      </button>
    </div>
  );
};

const DashboardHeader = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  // 1. Normalize user object
  const u = user?.user ?? user;

  // 2. Define priority for name display
  // We check localStorage first because the backend is currently only returning 'email'
  const nameCandidates = [
    localStorage.getItem("display_name"), 
    u?.full_name,
    u?.display_name,
  ];

  // 3. Find the first valid string that isn't an email address
  const validName = nameCandidates.find(
    (n) => n && typeof n === "string" && n.trim() && !n.includes("@")
  );

  // 4. Final Display Logic: Found Name > Email Prefix > fallback "Creator"
  const displayName = validName?.trim() || (u?.email ? u.email.split("@")[0] : "Creator");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-11 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 group transition-opacity"
        >
          
          <span className="text-xl font-bold tracking-tight text-slate-900">
            ResumeFlow<span className="text-blue-600 font-black ml-0.5">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <LanguageToggle />

          <div className="h-4 w-px bg-slate-100 hidden sm:block" />

          <Link
            to="/app/settings"
            className="hidden sm:flex items-center gap-3 group transition-opacity"
          >
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                {t("dashboard.hi") || "Hi,"}
              </span>
              <span className="text-xs font-bold text-slate-900 leading-none group-hover:text-blue-600 transition-colors">
                {displayName}
              </span>
            </div>
            <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center group-hover:border-slate-200 transition-colors">
              <User className="w-4 h-4 text-slate-400" />
            </div>
          </Link>

          <div className="h-4 w-px bg-slate-100 hidden sm:block" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-slate-500 hover:text-red-500 transition-all uppercase tracking-widest group"
          >
            <LogOut className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            {t("dashboard.logout") || "LOGOUT"}
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;