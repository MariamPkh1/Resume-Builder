import React, { useState, useRef, useEffect } from "react";
import { Search, X, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const T = {
  bg: "rgba(247,249,251,0.92)",
  surface: "#ffffff",
  surfaceContainer: "#eceef0",
  surfaceContainerHigh: "#e6e8ea",
  primary: "#000000",
  onPrimary: "#ffffff",
  onSurface: "#191c1e",
  onSurfaceVariant: "#45464d",
  outline: "#76777d",
  outlineVariant: "rgba(198,198,205,0.3)",
  secondary: "#545f73",
  fontBody: "'Inter', -apple-system, sans-serif",
};

const langOptions = [
  { code: "en", label: "EN" },
  { code: "ka", label: "ქარ" },
];

const DashboardHeader = ({ searchQuery, onSearchChange, onSearchSubmit, onSearchClear }) => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const u = user?.user ?? user;
  const nameCandidates = [localStorage.getItem("display_name"), u?.full_name, u?.display_name];
  const validName = nameCandidates.find((n) => n && typeof n === "string" && n.trim() && !n.includes("@"));
  const displayName = validName?.trim() || (u?.email ? u.email.split("@")[0] : "Creator");

  return (
    <header style={{
      height: 52,
      paddingLeft: 28, paddingRight: 36,
      background: T.bg,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: `1px solid ${T.outlineVariant}`,
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      position: "sticky", top: 0, zIndex: 40,
      fontFamily: T.fontBody,
    }}>
      {/* Search bar */}
      <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
        <Search size={12} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.outline, pointerEvents: "none" }} />
        <input
          type="text"
          placeholder="Search resumes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSearchSubmit?.(); } }}
          style={{
            width: "100%", boxSizing: "border-box",
            paddingLeft: 32, paddingRight: searchQuery ? 28 : 14,
            paddingTop: 8, paddingBottom: 8,
            border: "none", borderRadius: 9999,
            background: T.surfaceContainerHigh,
            fontSize: 12, color: T.onSurface,
            fontFamily: T.fontBody, outline: "none",
            transition: "background 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => { e.target.style.background = T.surface; e.target.style.boxShadow = "0 0 0 2px rgba(0,0,0,0.08)"; }}
          onBlur={(e) => { e.target.style.background = T.surfaceContainerHigh; e.target.style.boxShadow = "none"; }}
        />
        {searchQuery && (
          <button type="button" onClick={onSearchClear} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.outline, padding: 2, display: "flex" }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {/* Language toggle */}
        <div ref={langRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 9px", borderRadius: 9999,
              border: `1px solid ${T.outlineVariant}`,
              background: "transparent", cursor: "pointer", color: T.secondary,
              transition: "all 0.15s", fontFamily: T.fontBody,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceContainer; e.currentTarget.style.color = T.onSurface; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.secondary; }}
          >
            {/* Globe icon via SVG to avoid extra import */}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>
              {language === "en" ? "EN" : "ქარ"}
            </span>
          </button>
          {langOpen && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: T.surface, border: `1px solid ${T.outlineVariant}`, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", overflow: "hidden", zIndex: 100, minWidth: 130 }}>
              {langOptions.map((opt) => (
                <button key={opt.code} type="button" onClick={() => { setLanguage(opt.code); setLangOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", background: language === opt.code ? T.surfaceContainer : T.surface, border: "none", cursor: "pointer", fontFamily: T.fontBody, transition: "background 0.15s" }}
                  onMouseEnter={(e) => { if (language !== opt.code) e.currentTarget.style.background = "#f2f4f6"; }}
                  onMouseLeave={(e) => { if (language !== opt.code) e.currentTarget.style.background = T.surface; }}
                >
                  <span style={{ fontSize: 12, fontWeight: language === opt.code ? 700 : 500, color: T.onSurface }}>{opt.label}</span>
                  {language === opt.code && <span style={{ marginLeft: "auto", fontSize: 10, color: T.onSurface }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings icon */}
        <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: T.secondary, padding: 6, borderRadius: 9999, display: "flex", transition: "background 0.15s, color 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceContainer; e.currentTarget.style.color = T.onSurface; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.secondary; }}
        >
          <Settings size={15} strokeWidth={1.5} />
        </button>

        {/* User name */}
        <span style={{ fontSize: 12, fontWeight: 600, color: T.onSurface, fontFamily: T.fontBody, marginLeft: 4 }}>
          {t("dashboard.hi")}, {displayName}
        </span>
      </div>
    </header>
  );
};

export default DashboardHeader;
