import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  Zap
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

const NavBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLanguageSet = (lang) => {
    setLanguage(lang);
  };

  const isProMember = user?.subscription_tier === "pro" || 
    (user?.trial_end_date && new Date(user.trial_end_date) > new Date());

  const navLinks = [
    { name: t("nav.home"), path: "/" },
    { name: t("nav.templates"), path: "/templates" },
    { name: t("nav.pricing"), path: "/pricing" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-slate-100 py-2"
          : "bg-transparent py-3"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-10">
          {/* LOGO */}
          <Link
            to="/"
            className="flex items-center gap-3 group transition-opacity"
          >
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              ResumeFlow <span className="text-blue-600 font-black ml-0.5">AI</span>
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-bold tracking-tight transition-all ${
                    location.pathname === link.path
                      ? "text-blue-600"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="w-[1px] h-4 bg-slate-100" />

            {/* LANGUAGE TOGGLE */}
            <div className="flex items-center rounded-full border border-slate-100 bg-slate-50/50 p-1 text-[10px] font-black tracking-widest">
              <button
                type="button"
                onClick={() => handleLanguageSet("en")}
                className={`rounded-full px-3 py-1 transition-all ${language === "en" ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageSet("ka")}
                className={`rounded-full px-3 py-1 transition-all ${language === "ka" ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}
              >
                ქარ
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-4">
                {/* PRO BADGE */}
                <div
                  onClick={() => navigate("/pricing")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer transition-all border ${
                    isProMember
                      ? "bg-blue-50 border-blue-100 text-blue-700"
                      : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <Zap size={12} className={isProMember ? "fill-blue-500 text-blue-500" : ""} />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {isProMember ? "Pro" : "Free"}
                  </span>
                </div>

                <button
                  onClick={() => navigate("/app")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
                >
                  <LayoutDashboard size={14} />
                  {t("nav.workspace")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/signup")}
                className="px-6 py-2.5 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
              >
                {t("nav.getStarted")}
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 bg-white ${
          mobileMenuOpen ? "max-h-[400px] border-b border-slate-100 shadow-lg" : "max-h-0"
        }`}
      >
        <div className="p-6 space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-2 text-base font-bold tracking-tight ${
                location.pathname === link.path ? "text-blue-600" : "text-slate-700"
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Language</span>
              <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => handleLanguageSet("en")}
                  className={`rounded-full px-3 py-1 ${language === "en" ? "bg-white text-blue-600 shadow border-slate-100" : "text-slate-500"}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageSet("ka")}
                  className={`rounded-full px-3 py-1 ${language === "ka" ? "bg-white text-blue-600 shadow border-slate-100" : "text-slate-500"}`}
                >
                  ქარ
                </button>
              </div>
            </div>
            {user ? (
              <button
                onClick={() => { setMobileMenuOpen(false); navigate("/app"); }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl"
              >
                <LayoutDashboard size={18} />
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
  );
};

export default NavBar;