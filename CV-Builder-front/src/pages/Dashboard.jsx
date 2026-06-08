import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Plus, Zap, ChevronRight, Loader2, LayoutTemplate, Archive,
  LayoutGrid, List, CreditCard, Settings, HelpCircle, LogOut,
  FileText, User,
} from "lucide-react";

import DashboardHeader from "../components/DashboardHeader";
import CVCard from "../components/dashboard/CVCard";
import LabelBar from "../components/dashboard/LabelBar";
import CreateLabelModal from "../components/dashboard/CreateLabelModal";

import api from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { showToast } from "../utils/toast";

const T = {
  bg: "#f7f9fb",
  surface: "#ffffff",
  surfaceLow: "#f2f4f6",
  surfaceContainer: "#eceef0",
  surfaceContainerHigh: "#e6e8ea",
  primary: "#000000",
  onPrimary: "#ffffff",
  onSurface: "#191c1e",
  onSurfaceVariant: "#45464d",
  outline: "#76777d",
  outlineVariant: "rgba(198,198,205,0.3)",
  secondary: "#545f73",
  gold: "#B48C4F",
  error: "#ba1a1a",
  fontHeadline: "'Playfair Display', Georgia, serif",
  fontBody: "'Inter', -apple-system, sans-serif",
};

// ── Sidebar ─────────────────────────────────────────────────────────────────
const Sidebar = ({ isPro, user, cvSlotsUsed, maxCvs, t, onLogout }) => {
  const navigate = useNavigate();

  const NavBtn = ({ icon, label, active, onClick, disabled, danger }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "8px 11px", borderRadius: 7, border: "none", cursor: disabled ? "not-allowed" : "pointer",
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
      {/* Brand */}
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

      {/* Primary nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <NavBtn icon={<FileText size={13} strokeWidth={1.6} />} label={t("dashboard.myResumes")} active />
        <NavBtn icon={<User size={13} strokeWidth={1.6} />} label={t("dashboard.account")} onClick={() => navigate("/app/settings")} />
        <NavBtn icon={<CreditCard size={13} strokeWidth={1.6} />} label={t("dashboard.billing")} onClick={() => navigate("/pricing")} />
      </nav>

      {/* Bottom nav */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, borderTop: "1px solid rgba(198,198,205,0.2)", paddingTop: 10 }}>
        <NavBtn icon={<HelpCircle size={13} strokeWidth={1.6} />} label={t("dashboard.support")} />
        <NavBtn icon={<LogOut size={13} strokeWidth={1.6} />} label={t("dashboard.logout")} onClick={onLogout} danger />
      </div>
    </aside>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    user, isPro, isTrialActive, daysLeftInTrial, refreshUser,
    maxCvs, cvSlotsUsed: authCvSlotsUsed, canCreateResume, logout,
  } = useAuth();

  const [resumes, setResumes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [listFetching, setListFetching] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const [tab, setTab] = useState("active");
  const [filterLabel, setFilterLabel] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef(null);
  const [showCreateLabel, setShowCreateLabel] = useState(false);

  const cvSlotsUsed = authCvSlotsUsed;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(searchQuery.trim()); debounceRef.current = null; }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  useEffect(() => {
    api.get("/api/labels/").then(({ data }) => setLabels(data)).catch(() => {});
    refreshUser?.();
  }, [refreshUser]);

  const fetchResumes = useCallback(async () => {
    if (hasLoadedOnceRef.current) setListFetching(true);
    try {
      const params = new URLSearchParams();
      params.set("archived", tab === "archived" ? "true" : "false");
      if (filterLabel) params.set("label", filterLabel);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const { data } = await api.get(`/api/cvs/?${params.toString()}`);
      setResumes(data);
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
    } finally {
      setListFetching(false);
      if (!hasLoadedOnceRef.current) { hasLoadedOnceRef.current = true; setBootstrapped(true); }
    }
  }, [tab, filterLabel, debouncedSearch, navigate]);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  const handleSearchSubmit = () => { if (debounceRef.current) clearTimeout(debounceRef.current); setDebouncedSearch(searchQuery.trim()); };
  const handleSearchClear = () => { if (debounceRef.current) clearTimeout(debounceRef.current); setSearchQuery(""); setDebouncedSearch(""); };
  const handleCreate = () => { if (!canCreateResume) { navigate("/pricing"); return; } navigate("/templates"); };
  const handleLogout = () => { logout(); navigate("/"); };

  const handleDelete = async (id) => {
    try { await api.delete(`/api/cvs/${id}/`); setResumes((prev) => prev.filter((r) => r.id !== id)); refreshUser(); }
    catch { showToast({ message: t("dashboard.deleteFailed") }); }
  };

  const handleDuplicate = async (resume) => {
    if (!isPro) { navigate("/pricing"); return; }
    try {
      const res = await api.post(`/api/cvs/${resume.id}/duplicate/`);
      setResumes((prev) => [res.data, ...prev]); refreshUser();
    } catch (err) {
      if (err.response?.status === 403) { showToast({ message: err.response?.data?.detail || "CV limit reached." }); navigate("/pricing"); }
      else showToast({ message: "Duplicate failed." });
    }
  };

  const handleArchive = async (resume) => {
    try { await api.post(`/api/cvs/${resume.id}/archive/`); setResumes((prev) => prev.filter((r) => r.id !== resume.id)); }
    catch { showToast({ message: "Archive failed." }); }
  };

  const handleUnarchive = async (resume) => {
    try { await api.post(`/api/cvs/${resume.id}/unarchive/`); setResumes((prev) => prev.filter((r) => r.id !== resume.id)); }
    catch { showToast({ message: "Unarchive failed." }); }
  };

  const handleLabelUpdate = (cvId, newLabels) => {
    setResumes((prev) => prev.map((r) => (r.id === cvId ? { ...r, labels: newLabels } : r)));
  };

  const handleDeleteLabel = async (labelId) => {
    try {
      await api.delete(`/api/labels/${labelId}/`);
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
      if (filterLabel === labelId) setFilterLabel(null);
      setResumes((prev) => prev.map((r) => ({ ...r, labels: (r.labels || []).filter((l) => l.id !== labelId) })));
    } catch { showToast({ message: "Failed to delete label." }); }
  };

  const handleTabChange = (newTab) => { setTab(newTab); setFilterLabel(null); setResumes([]); };

  if (!bootstrapped) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Loader2 style={{ width: 26, height: 26, color: T.primary, animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 9, fontWeight: 700, color: T.outline, textTransform: "uppercase", letterSpacing: "0.18em", fontFamily: T.fontBody }}>
          {t("dashboard.initializing")}
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: T.fontBody }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .new-project-card:hover { border-color: rgba(25,28,30,0.3) !important; }
        .new-project-card:hover .np-icon { background: #191c1e !important; color: #fff !important; }
        .new-project-card:hover .np-title { color: #191c1e !important; }
      `}</style>

      <Sidebar isPro={isPro} user={user} cvSlotsUsed={cvSlotsUsed} maxCvs={maxCvs} t={t} onLogout={handleLogout} />

      <div style={{ marginLeft: 200, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        <DashboardHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onSearchClear={handleSearchClear}
        />

        {/* Banners */}
        {isTrialActive && (
          <div style={{ background: "#f0fdf4", borderBottom: "1px solid rgba(134,239,172,0.4)", padding: "10px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={11} color="#16a34a" />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Pro trial: <strong>{daysLeftInTrial} day{daysLeftInTrial !== 1 ? "s" : ""} left</strong>
              </span>
            </div>
            <button type="button" onClick={() => navigate("/pricing")} style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Upgrade to keep Pro <ChevronRight size={10} />
            </button>
          </div>
        )}
        {!isPro && !isTrialActive && (
          <div style={{ background: "rgba(180,140,79,0.06)", borderBottom: "1px solid rgba(180,140,79,0.2)", padding: "10px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={11} color={T.gold} />
              <span style={{ fontSize: 10, fontWeight: 600, color: T.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {t("dashboard.freeTierActive")}: <strong style={{ color: T.onSurface }}>{cvSlotsUsed}/{maxCvs} {t("dashboard.resumes")}</strong>
              </span>
            </div>
            <button type="button" onClick={() => navigate("/pricing")} style={{ fontSize: 10, fontWeight: 700, color: T.gold, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {t("dashboard.upgradeUnlimited")} <ChevronRight size={10} />
            </button>
          </div>
        )}

        {/* Page content */}
        <main style={{ padding: "32px 36px 56px", flex: 1, maxWidth: 1440, width: "100%", boxSizing: "border-box" }}>

          {/* Hero heading */}
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontFamily: T.fontHeadline, fontSize: 28, fontWeight: 700, color: T.onSurface, lineHeight: 1.25, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              {t("dashboard.myWorkspaceTitle")}
            </h2>
            <p style={{ fontSize: 13, color: T.secondary, margin: 0, lineHeight: 1.6 }}>
              {t("dashboard.manageDocuments")}
            </p>
          </div>

          {/* Filter bar row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, gap: 10, flexWrap: "wrap" }}>
            <LabelBar
              tab={tab}
              onTabChange={handleTabChange}
              labels={labels}
              filterLabel={filterLabel}
              onFilterChange={setFilterLabel}
              onDeleteLabel={handleDeleteLabel}
              onNewLabel={() => setShowCreateLabel(true)}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 2, background: T.surfaceLow, borderRadius: 7, padding: 3, border: `1px solid ${T.outlineVariant}` }}>
                <button style={{ padding: "5px 8px", background: T.primary, borderRadius: 5, border: "none", cursor: "pointer", color: T.onPrimary, display: "flex" }}>
                  <LayoutGrid size={13} />
                </button>
                <button
                  style={{ padding: "5px 8px", background: "transparent", borderRadius: 5, border: "none", cursor: "pointer", color: T.onSurfaceVariant, display: "flex", transition: "background 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceContainerHigh; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <List size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Grid / empty state */}
          {resumes.length === 0 ? (
            <div style={{ position: "relative", background: T.surface, border: `1px solid ${T.outlineVariant}`, borderRadius: 16, padding: "80px 40px", textAlign: "center", boxShadow: "0px 20px 40px -10px rgba(0,0,0,0.04)" }}>
              {listFetching && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, background: "rgba(247,249,251,0.85)", backdropFilter: "blur(4px)" }}>
                  <Loader2 style={{ width: 26, height: 26, color: T.primary, animation: "spin 0.8s linear infinite" }} />
                </div>
              )}
              {tab === "archived" ? (
                debouncedSearch ? (
                  <>
                    <LayoutTemplate size={30} color={T.outlineVariant} style={{ margin: "0 auto 18px" }} />
                    <h2 style={{ fontFamily: T.fontHeadline, fontSize: 22, fontWeight: 700, color: T.onSurface, marginBottom: 8 }}>{t("dashboard.noArchivedSearchResults")}</h2>
                    <p style={{ color: T.secondary, fontSize: 14, marginBottom: 20 }}>{t("dashboard.noArchivedSearchResultsDesc")}</p>
                    <button type="button" onClick={handleSearchClear} style={{ padding: "9px 24px", border: "none", color: T.onPrimary, borderRadius: 8, fontSize: 12, fontWeight: 600, background: T.primary, cursor: "pointer" }}>{t("dashboard.clearSearch")}</button>
                  </>
                ) : (
                  <>
                    <Archive size={30} color={T.outlineVariant} style={{ margin: "0 auto 18px" }} />
                    <h2 style={{ fontFamily: T.fontHeadline, fontSize: 22, fontWeight: 700, color: T.onSurface, marginBottom: 8 }}>{t("dashboard.noArchivedResumes")}</h2>
                    <p style={{ color: T.secondary, fontSize: 14 }}>{t("dashboard.noArchivedResumesDesc")}</p>
                  </>
                )
              ) : debouncedSearch ? (
                <>
                  <LayoutTemplate size={30} color={T.outlineVariant} style={{ margin: "0 auto 18px" }} />
                  <h2 style={{ fontFamily: T.fontHeadline, fontSize: 22, fontWeight: 700, color: T.onSurface, marginBottom: 8 }}>{t("dashboard.noSearchResults")}</h2>
                  <p style={{ color: T.secondary, fontSize: 14, marginBottom: 20 }}>{t("dashboard.noSearchResultsDesc")}</p>
                  <button type="button" onClick={handleSearchClear} style={{ padding: "9px 24px", border: "none", color: T.onPrimary, borderRadius: 8, fontSize: 12, fontWeight: 600, background: T.primary, cursor: "pointer" }}>{t("dashboard.clearSearch")}</button>
                </>
              ) : (
                <>
                  <LayoutTemplate size={30} color={T.outlineVariant} style={{ margin: "0 auto 18px" }} />
                  <h2 style={{ fontFamily: T.fontHeadline, fontSize: 22, fontWeight: 700, color: T.onSurface, marginBottom: 8 }}>{t("dashboard.workspaceEmpty")}</h2>
                  <p style={{ color: T.secondary, fontSize: 14, marginBottom: 24 }}>{t("dashboard.workspaceEmptyDesc")}</p>
                  <button type="button" onClick={handleCreate} style={{ padding: "10px 28px", border: "none", color: T.onPrimary, borderRadius: 8, fontSize: 12, fontWeight: 600, background: T.primary, cursor: "pointer" }}>{t("dashboard.selectTemplate")}</button>
                </>
              )}
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              {listFetching && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80, background: "rgba(247,249,251,0.7)", backdropFilter: "blur(4px)", borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 9999, background: T.surface, border: `1px solid ${T.outlineVariant}`, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                    <Loader2 style={{ width: 14, height: 14, color: T.primary, animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.secondary }}>{t("dashboard.searching")}</span>
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 18 }}>
                {resumes.map((resume) => (
                  <CVCard
                    key={resume.id}
                    resume={resume}
                    tab={tab}
                    isPro={isPro}
                    labels={labels}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onLabelUpdate={handleLabelUpdate}
                    t={t}
                  />
                ))}

                {tab === "active" && (
                  <div
                    className="new-project-card"
                    onClick={handleCreate}
                    style={{
                      background: "transparent",
                      border: `2px dashed ${T.outlineVariant}`,
                      borderRadius: 10,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 14, padding: "32px 24px", cursor: "pointer",
                      transition: "border-color 0.25s",
                      alignSelf: "stretch",
                    }}
                  >
                    <div
                      className="np-icon"
                      style={{
                        width: 52, height: 52, borderRadius: "50%",
                        background: T.surfaceContainer, color: T.onSurfaceVariant,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.25s",
                      }}
                    >
                      <Plus size={22} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div className="np-title" style={{ fontSize: 13, fontWeight: 600, color: T.secondary, marginBottom: 4, transition: "color 0.2s" }}>{t("dashboard.startNewProject")}</div>
                      <div style={{ fontSize: 11, color: T.outline }}>{t("dashboard.selectFromTemplates")}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {showCreateLabel && (
        <CreateLabelModal
          onClose={() => setShowCreateLabel(false)}
          onCreate={(newLabel) => setLabels((prev) => [...prev, newLabel])}
        />
      )}
    </div>
  );
};

export default Dashboard;
