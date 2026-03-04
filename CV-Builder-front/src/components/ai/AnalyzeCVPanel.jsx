import React, { useState } from "react";
import { X, Loader2, TrendingUp, Target, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { analyzeCVAPI } from "../../services/aiService";

/**
 * AnalyzeCVPanel
 *
 * Slide-in panel for full CV analysis (Integration Guide Section 9A).
 * POST /api/ai/analyze-cv/ → displays overall_score, strengths, improvements, ats_notes.
 * Suggest-only: no Apply; analysis is informational.
 *
 * Props:
 *   cvId    — string (uuid)
 *   onClose — () => void
 */

const scoreTheme = (score) =>
  score >= 80
    ? { color: "#10b981", label: "Strong", lightBg: "bg-emerald-50", border: "border-emerald-200" }
    : score >= 60
    ? { color: "#f59e0b", label: "Needs Work", lightBg: "bg-amber-50", border: "border-amber-200" }
    : { color: "#ef4444", label: "Weak", lightBg: "bg-red-50", border: "border-red-200" };

const AnalyzeCVPanel = ({ cvId, onClose }) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [ran, setRan] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    if (!ran) setResult(null);

    const { data, error: err } = await analyzeCVAPI({
      cvId,
      jobDescription: jobDescription.trim() || undefined,
      language,
    });

    setLoading(false);

    if (err) {
      if (err.upgrade_required) {
        setError(err.detail ?? t("analyze.upgradeRequired"));
      } else {
        setError(err.detail ?? err.error ?? t("analyze.failed"));
      }
      return;
    }

    const analysis = data?.analysis ?? data?.result ?? data;
    setResult(analysis);
    setRan(true);
  };

  const theme = result?.overall_score != null ? scoreTheme(result.overall_score) : null;

  return (
    <div className="fixed inset-0 z-[90] flex">
      <div
        className="flex-1 bg-black/30"
        style={{ backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div className="w-full max-w-[440px] bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <TrendingUp size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900">{t("analyze.title")}</p>
              <p className="text-[10px] text-gray-400">{t("analyze.subtitle")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!ran && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <p className="text-xs text-indigo-800 leading-relaxed">{t("analyze.whatDoes")}</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("analyze.jobDescription")} <span className="font-normal text-gray-400">({t("analyze.jobDescriptionOptional")})</span>
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder={t("analyze.placeholder")}
                  rows={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 resize-none"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{error}</p>
                {error?.includes("Upgrade") && (
                  <button
                    onClick={() => navigate("/pricing")}
                    className="mt-2 text-xs font-bold text-red-700 underline"
                  >
                    View plans
                  </button>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 size={32} className="text-indigo-500 animate-spin" />
              <p className="text-sm font-semibold text-gray-700">Analyzing your CV…</p>
              <p className="text-xs text-gray-400">Usually takes 3–5 seconds</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {result.overall_score != null && (
                <div className={`flex flex-col items-center py-6 rounded-2xl border ${theme?.lightBg} ${theme?.border}`}>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Overall score</p>
                  <p className="text-5xl font-black" style={{ color: theme?.color }}>
                    {result.overall_score}
                  </p>
                  <p className="text-xs font-bold mt-1" style={{ color: theme?.color }}>
                    {theme?.label}
                  </p>
                </div>
              )}

              {Array.isArray(result.strengths) && result.strengths.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Strengths
                  </p>
                  <ul className="space-y-1.5">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-emerald-500 shrink-0">•</span>
                        <span>{typeof s === "string" ? s : s?.text ?? JSON.stringify(s)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(result.improvements) && result.improvements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Target size={12} /> Areas to improve
                  </p>
                  <ul className="space-y-1.5">
                    {result.improvements.map((imp, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-amber-500 shrink-0">•</span>
                        <span>{typeof imp === "string" ? imp : imp?.text ?? JSON.stringify(imp)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(result.ats_notes) && result.ats_notes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    ATS notes
                  </p>
                  <ul className="space-y-1.5">
                    {result.ats_notes.map((note, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-blue-500 shrink-0">•</span>
                        <span>{typeof note === "string" ? note : note?.text ?? JSON.stringify(note)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(!result.strengths?.length && !result.improvements?.length && !result.ats_notes?.length) && (
                <p className="text-sm text-gray-500 italic">No detailed analysis available. Try adding a job description for targeted feedback.</p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin" /> Analyzing…</>
            ) : ran ? (
              <>{t("analyze.analyzeAgain")}</>
            ) : (
              t("analyze.title")
            )}
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Uses 1 of your monthly AI analyses
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeCVPanel;
