import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LayoutDashboard, Zap, Globe, ChevronDown } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

const NavBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isProMember =
    ["pro", "professional"].includes(user?.subscription_tier) ||
    (user?.trial_end_date && new Date(user.trial_end_date) > new Date());

  const navLinks = [
    { name: t("nav.home"), path: "/" },
    { name: t("nav.templates"), path: "/templates" },
    { name: t("nav.pricing"), path: "/pricing" },
    { name: t("nav.contact"), path: "/contact" },
  ];

  const langOptions = [
    { code: "en", flag: "🇬🇧", label: "English" },
    { code: "ka", flag: "🇬🇪", label: "ქართული" },
  ];

  const currentLang = langOptions.find((l) => l.code === language);

  return (
    <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
      @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.3); }
      }
      .workspace-btn:hover {
        background: #0a0a0b !important;
        box-shadow: 0 8px 20px rgba(10,10,11,0.22);
      }
      .nav-link-line {
        position: relative;
        padding-bottom: 2px;
      }
      .nav-link-line::after {
        content: '';
        position: absolute;
        bottom: -3px;
        left: 0;
        width: 0;
        height: 1.5px;
        background-color: #0a0a0b;
        border-radius: 2px;
        transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .nav-link-line:hover::after,
      .nav-link-active::after {
        width: 100%;
      }
    `}</style>
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-slate-100 py-2"
          : "bg-transparent py-3"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5">
        <div className="flex items-center h-11" style={{ position: "relative" }}>

          {/* LOGO — left */}
          <Link to="/" className="flex items-center transition-opacity" style={{ paddingLeft: 8 }}>
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", color: "#0a0a0b" }}>
              ResumeFlowAI
            </span>
          </Link>

          {/* DESKTOP NAV — perfectly centered via absolute positioning */}
          <div
            className="hidden md:flex items-center gap-6"
            style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                style={{ fontFamily: "Inter, sans-serif" }}
                className={`nav-link-line text-[14px] font-semibold tracking-tight transition-colors ${
                  location.pathname === link.path
                    ? "text-slate-900 nav-link-active"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* RIGHT CONTROLS — language + tier badge + workspace */}
          <div className="hidden md:flex items-center gap-3" style={{ marginLeft: "auto" }}>

            {/* LANGUAGE DROPDOWN */}
            <div ref={langRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setLangOpen(!langOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 999,
                  border: "1px solid #e2e8f0", background: "rgba(248,250,252,0.6)",
                  cursor: "pointer", fontFamily: "Inter, sans-serif",
                  color: "#4b5563", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(248,250,252,0.6)"; }}
              >
                <Globe size={13} strokeWidth={2} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>
                  {language === "en" ? "EN" : "ქარ"}
                </span>
                <ChevronDown size={11} style={{ transition: "transform 0.2s", transform: langOpen ? "rotate(180deg)" : "none" }} />
              </button>

              {langOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 6px)",
                  background: "white", border: "1px solid #e2e8f0",
                  borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  overflow: "hidden", zIndex: 100, minWidth: 150,
                }}>
                  {langOptions.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => { setLanguage(opt.code); setLangOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 9,
                        width: "100%", padding: "9px 14px",
                        background: language === opt.code ? "#eff6ff" : "white",
                        border: "none", cursor: "pointer", textAlign: "left",
                        fontFamily: "Inter, sans-serif", transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { if (language !== opt.code) e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={(e) => { if (language !== opt.code) e.currentTarget.style.background = "white"; }}
                    >
                      <span style={{ fontSize: 15 }}>{opt.flag}</span>
                      <span style={{ fontSize: 13, fontWeight: language === opt.code ? 700 : 500, color: language === opt.code ? "#2170e4" : "#374151" }}>
                        {opt.label}
                      </span>
                      {language === opt.code && <span style={{ marginLeft: "auto", color: "#2170e4", fontSize: 12 }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-4 bg-slate-200" />
            {user ? (
              <div className="flex items-center gap-3">
                {/* TIER BADGE — pulsing dot design */}
                <div
                  onClick={() => navigate("/pricing")}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "5px 14px", borderRadius: 999, cursor: "pointer",
                    background: "rgba(33,112,228,0.05)",
                    border: "1px solid rgba(33,112,228,0.12)",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "#2170e4", display: "inline-block",
                    animation: "pulse-dot 1.4s cubic-bezier(0,0,0.2,1) infinite",
                  }} />
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "#2170e4",
                  }}>
                    {user?.subscription_tier === "professional"
                      ? "Prof Active"
                      : user?.subscription_tier === "pro" || (user?.trial_end_date && new Date(user.trial_end_date) > new Date())
                      ? "Pro Active"
                      : "Free Active"}
                  </span>
                </div>

                <button
                  onClick={() => navigate("/app")}
                  style={{ fontFamily: "Inter, sans-serif" }}
                  className="workspace-btn flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-full transition-all active:scale-95"
                >
                  {t("nav.workspace")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/signup")}
                style={{ fontFamily: "Inter, sans-serif" }}
                className="workspace-btn px-5 py-2 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-full transition-all active:scale-95"
              >
                {t("nav.getStarted")}
              </button>
            )}
          </div>

          {/* MOBILE TOGGLE */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 bg-white ${
          mobileMenuOpen ? "max-h-[420px] border-b border-slate-100 shadow-lg" : "max-h-0"
        }`}
      >
        <div className="p-5 space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-2 text-base font-bold tracking-tight ${
                location.pathname === link.path ? "text-slate-900" : "text-slate-700"
              }`}
            >
              {link.name}
            </Link>
          ))}

          <div className="pt-3 border-t border-slate-100 space-y-3">
            {/* Mobile language */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Globe size={14} className="text-slate-400" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Language
              </span>
              <div style={{ display: "flex", borderRadius: 999, border: "1px solid #e2e8f0", background: "#f8fafc", overflow: "hidden" }}>
                {langOptions.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setLanguage(opt.code)}
                    style={{
                      padding: "4px 12px", border: "none", cursor: "pointer",
                      fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700,
                      background: language === opt.code ? "white" : "transparent",
                      color: language === opt.code ? "#2170e4" : "#64748b",
                      boxShadow: language === opt.code ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      borderRadius: 999, transition: "all 0.15s",
                    }}
                  >
                    {opt.flag} {opt.code === "en" ? "EN" : "ქარ"}
                  </button>
                ))}
              </div>
            </div>

            {user ? (
              <button
                onClick={() => { setMobileMenuOpen(false); navigate("/app"); }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl"
              >
                {t("nav.workspace")}
              </button>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); navigate("/signup"); }}
                className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl"
              >
                {t("nav.getStarted")}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
    </>
  );
};

export default NavBar;
