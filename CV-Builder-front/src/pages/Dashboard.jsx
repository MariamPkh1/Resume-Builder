import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Zap, ChevronRight, Loader2, LayoutTemplate, Archive, Search, X } from "lucide-react";

import DashboardHeader from "../components/DashboardHeader";
import CVCard from "../components/dashboard/CVCard";
import LabelBar from "../components/dashboard/LabelBar";
import CreateLabelModal from "../components/dashboard/CreateLabelModal";

import api from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isPro, isTrialActive, daysLeftInTrial, refreshUser } = useAuth();

  const [resumes, setResumes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");
  const [filterLabel, setFilterLabel] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef(null);
  const [showCreateLabel, setShowCreateLabel] = useState(false);

  // Debounce search input — 200ms feels instant, avoids every-keystroke API calls
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      debounceRef.current = null;
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  // Labels only need fetching once on mount, not on every search/filter change
  useEffect(() => {
    api.get("/api/labels/")
      .then(({ data }) => setLabels(data))
      .catch(() => {});
  }, []);

  const fetchResumes = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [tab, filterLabel, debouncedSearch, navigate]);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  const handleSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDebouncedSearch(searchQuery.trim());
  };

  const handleClearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchQuery("");
    setDebouncedSearch("");
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!isPro && resumes.length >= 2) { navigate("/pricing"); return; }
    navigate("/templates");
  };

  const handleDelete = async (id) => {
    // Always hard-delete the CV. Archiving is handled only by the Archive button.
    try {
      await api.delete(`/api/cvs/${id}/`);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      refreshUser();
    } catch {
      alert(t("dashboard.deleteFailed"));
    }
  };

  const handleDuplicate = async (resume) => {
    if (!isPro) { navigate("/pricing"); return; }
    try {
      const res = await api.post(`/api/cvs/${resume.id}/duplicate/`);
      setResumes((prev) => [res.data, ...prev]);
      refreshUser();
    } catch (err) {
      if (err.response?.status === 403) {
        alert(err.response?.data?.detail || "CV limit reached. Upgrade to duplicate more.");
        navigate("/pricing");
      } else alert("Duplicate failed.");
    }
  };

  const handleArchive = async (resume) => {
    try {
      await api.post(`/api/cvs/${resume.id}/archive/`);
      setResumes((prev) => prev.filter((r) => r.id !== resume.id));
    } catch { alert("Archive failed."); }
  };

  const handleUnarchive = async (resume) => {
    try {
      await api.post(`/api/cvs/${resume.id}/unarchive/`);
      setResumes((prev) => prev.filter((r) => r.id !== resume.id));
    } catch { alert("Unarchive failed."); }
  };

  const handleLabelUpdate = (cvId, newLabels) => {
    setResumes((prev) =>
      prev.map((r) => (r.id === cvId ? { ...r, labels: newLabels } : r))
    );
  };

  const handleDeleteLabel = async (labelId) => {
    // REMOVED: window.confirm from here too
    try {
      await api.delete(`/api/labels/${labelId}/`);
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
      if (filterLabel === labelId) setFilterLabel(null);
      setResumes((prev) =>
        prev.map((r) => ({ 
          ...r, 
          labels: (r.labels || []).filter((l) => l.id !== labelId) 
        }))
      );
    } catch { 
      alert("Failed to delete label."); 
    }
  };

  const handleTabChange = (newTab) => { setTab(newTab); setFilterLabel(null); };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          {t("dashboard.initializing")}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardHeader />

      {/* Pro trial banner */}
      {isTrialActive && (
        <div className="fixed top-11 left-0 right-0 z-40 bg-emerald-50/90 backdrop-blur-md border-b border-emerald-200 py-2.5 px-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Zap size={12} className="text-emerald-600" />
              <p className="text-[10px] font-medium text-emerald-800 uppercase tracking-widest">
                Pro trial: <span className="font-bold">{daysLeftInTrial} day{daysLeftInTrial !== 1 ? "s" : ""} left</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 uppercase tracking-widest"
            >
              Upgrade to keep Pro <ChevronRight size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Free tier banner */}
      {!isPro && !isTrialActive && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-white/70 backdrop-blur-md border-b border-slate-100 py-2.5 px-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Zap size={12} className="text-blue-500" />
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                {t("dashboard.freeTierActive")}:{" "}
                <span className="text-slate-900 font-bold">{resumes.length}/2 Resumes</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest"
            >
              {t("dashboard.upgradeUnlimited")} <ChevronRight size={10} />
            </button>
          </div>
        </div>
      )}

      <main
        className={`max-w-6xl mx-auto px-4 pb-20 ${
          isTrialActive ? "pt-36" : !isPro ? "pt-36" : "pt-28"
        }`}
      >

        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t("dashboard.my")} {t("dashboard.workspace")}
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex gap-2 flex-1 sm:flex-initial">
              <div className="relative flex-1 sm:flex-initial sm:w-56">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t("dashboard.searchPlaceholder") || "Search CVs by title..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleSearch}
                className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shrink-0"
              >
                Search
              </button>
            </div>
            {tab === "active" && (
            <button
              type="button"
              onClick={handleCreate}
              className="flex items-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-white bg-slate-900 rounded-lg hover:bg-blue-600 transition-all active:scale-95"
            >
              <Plus size={16} /> {t("dashboard.createNewResume")}
            </button>
            )}
          </div>
        </div>

        <LabelBar
          tab={tab}
          onTabChange={handleTabChange}
          labels={labels}
          filterLabel={filterLabel}
          onFilterChange={setFilterLabel}
          onDeleteLabel={handleDeleteLabel}
          onNewLabel={() => setShowCreateLabel(true)}
        />

        {resumes.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-20 text-center">
            {tab === "archived" ? (
              debouncedSearch ? (
                <>
                  <Search size={32} className="text-slate-200 mx-auto mb-6" />
                  <h2 className="text-xl font-medium text-slate-900 mb-2">No archived resumes match your search</h2>
                  <p className="text-slate-400 text-sm mb-6">Try a different search term or clear the search.</p>
                  <button type="button" onClick={handleClearSearch} className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <Archive size={32} className="text-slate-200 mx-auto mb-6" />
                  <h2 className="text-xl font-medium text-slate-900 mb-2">No archived resumes</h2>
                  <p className="text-slate-400 text-sm">Archived resumes are hidden but never deleted.</p>
                </>
              )
            ) : debouncedSearch ? (
              <>
                <Search size={32} className="text-slate-200 mx-auto mb-6" />
                <h2 className="text-xl font-medium text-slate-900 mb-2">No CVs match your search</h2>
                <p className="text-slate-400 text-sm mb-6">Try a different search term or clear the search to see all CVs.</p>
                <button type="button" onClick={handleClearSearch} className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">
                  Clear search
                </button>
              </>
            ) : (
              <>
                <LayoutTemplate size={32} className="text-slate-200 mx-auto mb-6" />
                <h2 className="text-xl font-medium text-slate-900 mb-2">{t("dashboard.workspaceEmpty")}</h2>
                <p className="text-slate-400 text-sm mb-8">{t("dashboard.workspaceEmptyDesc")}</p>
                <button type="button" onClick={handleCreate} className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">
                  {t("dashboard.selectTemplate")}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          </div>
        )}
      </main>

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