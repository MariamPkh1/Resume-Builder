import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FileText, User, CreditCard, HelpCircle, LogOut,
  MapPin, CheckCircle, Loader2, Trash2, Camera, KeyRound,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { showToast } from "../utils/toast";
import DashboardHeader from "../components/DashboardHeader";

const T = {
  bg: "#f7f9fb",
  surface: "#ffffff",
  surfaceLow: "#f2f4f6",
  surfaceContainer: "#eceef0",
  primary: "#000000",
  onPrimary: "#ffffff",
  onSurface: "#191c1e",
  onSurfaceVariant: "#45464d",
  outline: "#76777d",
  outlineVariant: "rgba(198,198,205,0.3)",
  secondary: "#545f73",
  error: "#ba1a1a",
  fontHeadline: "'Playfair Display', Georgia, serif",
  fontBody: "'Inter', -apple-system, sans-serif",
};

// ── Sidebar ─────────────────────────────────────────────────────────────────
const Sidebar = ({ onLogout }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const NavBtn = ({ icon, label, active, onClick, disabled, danger }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "8px 11px", borderRadius: 7, border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: active ? T.primary : "transparent",
        color: danger ? T.error : active ? T.onPrimary : disabled ? T.outlineVariant : T.onSurfaceVariant,
        fontSize: 12, fontWeight: active ? 600 : 500,
        width: "100%", textAlign: "left",
        fontFamily: T.fontBody, transition: "background 0.15s, color 0.15s",
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) {
          e.currentTarget.style.background = danger ? "rgba(186,26,26,0.05)" : T.surfaceContainer;
          e.currentTarget.style.color = danger ? T.error : T.onSurface;
        }
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = danger ? T.error : T.onSurfaceVariant;
        }
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <aside style={{
      width: 200, flexShrink: 0,
      background: "rgba(233,235,238,0.96)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderRight: "1px solid rgba(0,0,0,0.05)",
      boxShadow: "6px 0 20px rgba(0,0,0,0.04)",
      display: "flex", flexDirection: "column",
      position: "fixed", top: 0, bottom: 0, left: 0,
      fontFamily: T.fontBody, zIndex: 50,
      padding: "26px 14px 20px",
    }}>
      <div style={{ marginBottom: 28, paddingLeft: 2 }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <h1 style={{ fontFamily: T.fontHeadline, fontSize: 17, fontWeight: 700, color: T.onSurface, letterSpacing: "-0.01em", margin: 0, lineHeight: 1.2 }}>
            ResumeFlowAI
          </h1>
        </Link>
        <p style={{ fontFamily: T.fontBody, fontSize: 8, fontWeight: 600, color: T.secondary, textTransform: "uppercase", letterSpacing: "0.14em", margin: "4px 0 0" }}>
          {t("dashboard.executiveSuite")}
        </p>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <NavBtn icon={<FileText size={13} strokeWidth={1.6} />} label={t("dashboard.myResumes")} onClick={() => navigate("/app")} />
        <NavBtn icon={<User size={13} strokeWidth={1.6} />} label={t("dashboard.account")} active />
        <NavBtn icon={<CreditCard size={13} strokeWidth={1.6} />} label={t("dashboard.billing")} onClick={() => navigate("/pricing")} />
      </nav>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, borderTop: "1px solid rgba(198,198,205,0.2)", paddingTop: 10 }}>
        <NavBtn icon={<HelpCircle size={13} strokeWidth={1.6} />} label={t("dashboard.support")} />
        <NavBtn icon={<LogOut size={13} strokeWidth={1.6} />} label={t("dashboard.logout")} onClick={onLogout} danger />
      </div>
    </aside>
  );
};

// ── Field ────────────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 10, fontWeight: 700, color: T.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: T.fontBody, opacity: 0.8 }}>
      {label}
    </label>
    {children}
  </div>
);

const inputBase = {
  width: "100%", boxSizing: "border-box",
  background: "transparent",
  border: "none", borderBottom: `1px solid ${T.outlineVariant}`,
  padding: "10px 0",
  fontSize: 14, color: T.onSurface, fontFamily: T.fontBody,
  outline: "none", transition: "border-color 0.15s",
};

// ── Settings page ────────────────────────────────────────────────────────────
const Settings = () => {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const { t, setLanguage } = useLanguage();

  const u = user?.user ?? user;

  const [fullName, setFullName]     = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [location, setLocation]     = useState("");
  const [prefLang, setPrefLang]     = useState("en");
  const [saving, setSaving]         = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [pwSaving, setPwSaving]     = useState(false);

  // search props for DashboardHeader
  const [search, setSearch] = useState("");

  useEffect(() => {
    setFullName(u?.full_name ?? localStorage.getItem("display_name") ?? "");
    setEmail(u?.email ?? "");
    setPhone(u?.phone ?? "");
    setLocation(u?.location ?? "");
    setPrefLang(u?.preferred_language === "ka" ? "ka" : "en");
  }, [u?.full_name, u?.email, u?.phone, u?.location, u?.preferred_language]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveSuccess(false);
    try {
      await api.patch("/api/auth/me/", {
        full_name: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        preferred_language: prefLang,
      });
      if (fullName.trim()) localStorage.setItem("display_name", fullName.trim());
      setLanguage(prefLang);
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      showToast({ message: t("settings.failedSave") });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPw || !newPw || !confirmPw) { showToast({ message: t("settings.fillPasswordFields") }); return; }
    if (newPw !== confirmPw) { showToast({ message: t("settings.passwordMismatch") }); return; }
    setPwSaving(true);
    try {
      await api.post("/api/auth/change-password/", { current_password: currentPw, new_password: newPw });
      showToast({ message: t("settings.passwordUpdated") });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      showToast({ message: err.response?.data?.detail || t("settings.passwordFailed") });
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => { logout(); navigate("/"); };

  const sectionStyle = {
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(226,232,240,0.5)",
    borderRadius: 8,
    padding: "24px",
    boxShadow: "0 20px 40px -20px rgba(0,0,0,0.04)",
    marginBottom: 20,
  };

  const sectionTitle = {
    fontFamily: T.fontHeadline,
    fontSize: 18, fontWeight: 600, color: T.onSurface,
    margin: "0 0 20px", paddingBottom: 14,
    borderBottom: `1px solid rgba(198,198,205,0.2)`,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: T.fontBody }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        input:focus { border-bottom-color: #000 !important; box-shadow: 0 1px 0 0 rgba(212,175,55,0.4); }
        input[type=password]:focus { border-bottom-color: #000 !important; }
      `}</style>

      <Sidebar onLogout={handleLogout} />

      <div style={{ marginLeft: 200, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <DashboardHeader
          searchQuery={search}
          onSearchChange={setSearch}
          onSearchClear={() => setSearch("")}
        />

        <main style={{ padding: "36px 52px 72px", maxWidth: 900, width: "100%", boxSizing: "border-box" }}>

          {/* Page heading */}
          <header style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: T.fontHeadline, fontSize: 28, fontWeight: 700, color: T.onSurface, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              {t("settings.title")}
            </h1>
            <p style={{ fontSize: 13, color: T.secondary, margin: 0, lineHeight: 1.6 }}>
              {t("settings.subtitle")}
            </p>
          </header>

          <form onSubmit={handleSave}>

            {/* Profile Photo */}
            <div style={sectionStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
                {/* Empty avatar placeholder */}
                <div style={{
                  width: 88, height: 88, borderRadius: "50%", flexShrink: 0,
                  background: T.surfaceContainer,
                  border: `2px solid ${T.outlineVariant}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", overflow: "hidden", cursor: "pointer",
                }}
                  onMouseEnter={(e) => { e.currentTarget.querySelector(".cam-overlay").style.opacity = 1; }}
                  onMouseLeave={(e) => { e.currentTarget.querySelector(".cam-overlay").style.opacity = 0; }}
                >
                  <User size={32} color={T.outline} strokeWidth={1.2} />
                  <div className="cam-overlay" style={{
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: 0, transition: "opacity 0.2s",
                  }}>
                    <Camera size={20} color="#fff" />
                  </div>
                </div>
                <div>
                  <h3 style={{ fontFamily: T.fontHeadline, fontSize: 17, fontWeight: 600, color: T.onSurface, margin: "0 0 4px" }}>
                    {t("settings.profilePhoto")}
                  </h3>
                  <p style={{ fontSize: 11, color: T.outline, margin: "0 0 14px" }}>{t("settings.photoHint")}</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" style={{ background: T.primary, color: T.onPrimary, border: "none", borderRadius: 4, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.fontBody }}>
                      {t("settings.uploadPhoto")}
                    </button>
                    <button type="button" style={{ background: "transparent", color: T.error, border: `1px solid rgba(186,26,26,0.2)`, borderRadius: 4, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.fontBody }}>
                      {t("settings.removePhoto")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div style={sectionStyle}>
              <h3 style={sectionTitle}>{t("settings.personalInfo")}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 32px" }}>
                <Field label={t("settings.fullName")}>
                  <input style={inputBase} type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("settings.fullNamePlaceholder")} />
                </Field>
                <Field label={t("settings.emailAddress")}>
                  <input style={{ ...inputBase, color: T.outline }} type="email" value={email} disabled />
                </Field>
                <Field label={t("settings.phoneNumber")}>
                  <input style={inputBase} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("settings.phonePlaceholder")} />
                </Field>
                <Field label={t("settings.location")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${T.outlineVariant}` }}>
                    <MapPin size={14} color={T.outline} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                    <input style={{ ...inputBase, borderBottom: "none", flex: 1 }} type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("settings.locationPlaceholder")} />
                  </div>
                </Field>
                <Field label={t("settings.language")}>
                  <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
                    {[{ code: "en", label: t("settings.english") }, { code: "ka", label: t("settings.georgian") }].map(({ code, label }) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setPrefLang(code)}
                        style={{
                          padding: "7px 18px", borderRadius: 4, fontSize: 12, fontWeight: 600,
                          fontFamily: T.fontBody, cursor: "pointer", transition: "all 0.15s",
                          background: prefLang === code ? T.primary : "transparent",
                          color: prefLang === code ? T.onPrimary : T.onSurfaceVariant,
                          border: prefLang === code ? `1px solid ${T.primary}` : `1px solid ${T.outlineVariant}`,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>

            {/* Change Password */}
            <div style={sectionStyle}>
              <h3 style={sectionTitle}>{t("settings.changePassword")}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px 24px", marginBottom: 20 }}>
                <Field label={t("settings.currentPassword")}>
                  <input style={inputBase} type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" />
                </Field>
                <Field label={t("settings.newPassword")}>
                  <input style={inputBase} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" />
                </Field>
                <Field label={t("settings.confirmPassword")}>
                  <input style={inputBase} type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" />
                </Field>
              </div>
              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={pwSaving}
                style={{ background: T.primary, color: T.onPrimary, border: "none", borderRadius: 4, padding: "9px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.fontBody, display: "flex", alignItems: "center", gap: 6, opacity: pwSaving ? 0.6 : 1 }}
              >
                {pwSaving ? <><Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> {t("settings.updating")}</> : <><KeyRound size={13} /> {t("settings.updatePassword")}</>}
              </button>
            </div>

            {/* Danger Zone */}
            <div style={{ ...sectionStyle, border: `1px solid rgba(186,26,26,0.2)`, marginBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ fontFamily: T.fontHeadline, fontSize: 17, fontWeight: 600, color: T.error, margin: "0 0 4px" }}>{t("settings.dangerZone")}</h3>
                  <p style={{ fontSize: 12, color: T.onSurfaceVariant, margin: 0 }}>
                    {t("settings.dangerDesc")}
                  </p>
                </div>
                <button
                  type="button"
                  style={{ background: "transparent", color: T.error, border: `1px solid rgba(186,26,26,0.2)`, borderRadius: 4, padding: "9px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.fontBody, display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", flexShrink: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(186,26,26,0.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Trash2 size={13} /> {t("settings.deleteAccount")}
                </button>
              </div>
            </div>

            {/* Footer actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 20, paddingTop: 24, marginTop: 24, borderTop: `1px solid ${T.outlineVariant}` }}>
              <button
                type="button"
                onClick={() => navigate("/app")}
                style={{ background: "none", border: "none", fontSize: 13, fontWeight: 500, color: T.onSurfaceVariant, cursor: "pointer", fontFamily: T.fontBody, transition: "color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.onSurface; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.onSurfaceVariant; }}
              >
                {t("settings.cancelChanges")}
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ background: T.primary, color: T.onPrimary, border: "none", borderRadius: 6, padding: "11px 28px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.fontBody, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", transition: "opacity 0.15s", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? (
                  <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> {t("settings.saving")}</>
                ) : (
                  <><CheckCircle size={14} /> {t("settings.saveChanges")}</>
                )}
              </button>
            </div>

          </form>
        </main>
      </div>
    </div>
  );
};

export default Settings;
