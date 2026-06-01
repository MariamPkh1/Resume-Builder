import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Save, Download, ChevronLeft, Loader2, Sparkles,
  ZoomIn, ZoomOut, History, ScanText, Crosshair, BarChart2,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const EditorShell = ({
  children,
  resumeData,
  setResumeData,
  onTemplateSwitch,
  preview,
  handleSave,
  isSaving,
  isExporting,
  handleDownloadPDF,
  onAIImprove,
  onATSCheck,
  onJobTailor,
  onAnalyzeCV,
  isATSLoading,
  atsScore,
  onVersionHistory,
}) => {
  const { resumeId, template } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [zoom, setZoom] = useState(0.85);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [localName, setLocalName] = useState(resumeData?.title || resumeData?.name || "");

  useEffect(() => {
    setLocalName(resumeData?.title || resumeData?.name || "");
  }, [resumeData?.title, resumeData?.name]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom((prev) => Math.min(Math.max(prev + delta, 0.3), 1.5));
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const handleTemplateSwitch = (newTemplate) => {
    onTemplateSwitch(newTemplate, localName || undefined);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setLocalName(val);
    setResumeData({ ...resumeData, title: val, name: val });
  };

  const ghostBtn = (active = false) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 9px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.01em",
    borderRadius: 8,
    border: `1px solid ${active ? "#0f172a" : "#e2e8f0"}`,
    background: active ? "#0f172a" : "white",
    color: active ? "white" : "#475569",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    lineHeight: 1,
  });

  return (
    <div
      className="flex flex-col h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans"
      style={{ transformOrigin: "top center" }}
    >
      <style>{`
        .editor-ghost-btn { transition: all 0.15s ease; }
        .editor-ghost-btn:hover { border-color: #94a3b8 !important; color: #0f172a !important; background: #f8fafc !important; }
        .editor-ghost-btn:active { transform: scale(0.97); }
        .ats-good  { border-color: #bbf7d0 !important; color: #166534 !important; background: #f0fdf4 !important; }
        .ats-mid   { border-color: #fde68a !important; color: #92400e !important; background: #fffbeb !important; }
        .ats-bad   { border-color: #fecaca !important; color: #991b1b !important; background: #fef2f2 !important; }
        .ats-good:hover { background: #dcfce7 !important; }
        .ats-mid:hover  { background: #fef9c3 !important; }
        .ats-bad:hover  { background: #fee2e2 !important; }
      `}</style>

      {/* ── TOP NAVBAR ── */}
      <header
        className="h-8 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50 flex-none"
        style={{ height: 32 }}
      >
        {/* Left */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => navigate("/app")}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          >
            <ChevronLeft size={17} />
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <input
            type="text"
            value={localName}
            onChange={handleNameChange}
            className="font-semibold text-gray-800 text-sm focus:outline-none bg-transparent border-b-2 border-transparent focus:border-gray-300 px-1 py-0.5 transition-all w-full max-w-[200px]"
            placeholder={t("editor.resumeNamePlaceholder")}
          />
          {isSaving ? (
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 px-2 py-1 rounded-full bg-slate-50 border border-slate-100">
              <Loader2 size={9} className="animate-spin" /> {t("editor.syncing")}
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> {t("editor.saved")}
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          {atsScore !== null && atsScore !== undefined && (
            <button
              onClick={onATSCheck}
              className={`editor-ghost-btn hidden lg:inline-flex ${
                atsScore >= 80 ? "ats-good" : atsScore >= 60 ? "ats-mid" : "ats-bad"
              }`}
              style={ghostBtn()}
            >
              <BarChart2 size={12} />
              {atsScore}% {t("editor.ats")}
            </button>
          )}

          {(atsScore === null || atsScore === undefined) && onATSCheck && (
            <button
              onClick={onATSCheck}
              disabled={isATSLoading}
              className="editor-ghost-btn hidden lg:inline-flex disabled:opacity-40"
              style={ghostBtn()}
            >
              {isATSLoading ? <Loader2 size={12} className="animate-spin" /> : <BarChart2 size={12} />}
              {t("editor.ats")}
            </button>
          )}

          {onJobTailor && (
            <button onClick={onJobTailor} className="editor-ghost-btn hidden lg:inline-flex" style={ghostBtn()}>
              <Crosshair size={12} /> {t("editor.tailor")}
            </button>
          )}

          {onAIImprove && (
            <button onClick={onAIImprove} className="editor-ghost-btn hidden lg:inline-flex" style={ghostBtn()}>
              <Sparkles size={12} /> {t("editor.improve")}
            </button>
          )}

          {onAnalyzeCV && (
            <button onClick={onAnalyzeCV} className="editor-ghost-btn hidden lg:inline-flex" style={ghostBtn()}>
              <ScanText size={12} /> {t("editor.analyze")}
            </button>
          )}

          {onVersionHistory && (
            <button onClick={onVersionHistory} className="editor-ghost-btn hidden lg:inline-flex" style={ghostBtn()}>
              <History size={12} /> {t("editor.history")}
            </button>
          )}

          <div className="h-4 w-px bg-gray-200 mx-1 hidden lg:block" />

          {/* <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
            title="Save"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          </button> */}

          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-1 bg-gray-900 hover:bg-gray-700 text-white px-3 py-1.5 rounded-md font-medium text-xs whitespace-nowrap transition-all active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span className="hidden sm:inline">
              {isExporting ? t("editor.generating") : t("editor.downloadPdf")}
            </span>
          </button>
        </div>
      </header>

      {/* ── ZOOM + TEMPLATE BAR ── */}
      <div className="bg-white border-b border-gray-100 flex-none z-40">
        <div className="flex items-center justify-end px-2 py-0.5 gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.1, 0.3))}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[10px] font-semibold text-gray-400 tabular-nums w-9 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.1, 1.5))}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
          >
            <ZoomIn size={13} />
          </button>

          <div className="mx-2 h-4 w-px bg-gray-200" />

          <div className="flex items-center bg-gray-100 border border-gray-200 p-0.5 rounded-lg gap-0.5">
            {[
              { value: "classic", label: "Classic" },
              { value: "modern", label: "Europass" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleTemplateSwitch(value)}
                className={`px-3 py-1 rounded-md text-[9px] font-bold tracking-widest uppercase transition-all ${
                  template === value
                    ? "bg-white text-gray-800 shadow-sm border border-gray-200"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile row: back button on left, edit/preview toggle on right */}
        <div className="md:hidden px-3 pb-2 pt-1 flex items-center justify-between">

          {/* ← Back to dashboard — only on mobile */}
          <button
            onClick={() => navigate("/app")}
            className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft size={14} />
            Dashboard
          </button>

          {/* Edit / Preview toggle */}
          <div className="inline-flex items-center bg-gray-100 border border-gray-200 p-0.5 rounded-full gap-0.5">
            <button
              type="button"
              onClick={() => setShowMobilePreview(false)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all ${
                !showMobilePreview
                  ? "bg-white text-gray-800 shadow-sm border border-gray-200"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setShowMobilePreview(true)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all ${
                showMobilePreview
                  ? "bg-white text-gray-800 shadow-sm border border-gray-200"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-1 overflow-hidden">
        <main className={`${showMobilePreview ? "hidden md:flex" : "flex"} w-full md:w-[45%] flex-col border-r border-gray-200 bg-white z-10`}>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
            <div className="max-w-md mx-auto space-y-6 pb-24">
              {children}
            </div>
          </div>
        </main>

        <section
          className={`${showMobilePreview ? "flex" : "hidden md:flex"} flex-1 flex-col overflow-hidden bg-gray-100`}
          style={{
            backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          <div className="md:hidden flex items-center px-4 py-2 bg-white border-b border-gray-200">
            <button
              onClick={() => setShowMobilePreview(false)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft size={14} /> Back to Edit
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="min-h-full flex justify-center py-10 px-8">
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  marginBottom: `${(zoom - 1) * 100}%`,
                }}
                className="flex-none transition-transform duration-150 ease-out shadow-xl"
              >
                {preview}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EditorShell;