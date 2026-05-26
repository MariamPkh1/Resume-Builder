import React, { useState } from "react";
import { X, Loader2, Check, ChevronRight, RotateCcw, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { tailorForJobAPI } from "../../services/aiService";

/**
 * Maps backend tailor-for-job response (Integration Guide Section 9D) to UI shape.
 * Backend returns: result { tailored_summary, keyword_targets, section_suggestions, priority_actions }
 * Builds: changes, missing_keywords, recommendations, tailored_cv_data (for Apply)
 */
const SECTION_LABEL_KEYS = {
  summary: "resume.summary",
  experience: "resume.experience",
  education: "resume.education",
  skills: "resume.skills",
  projects: "resume.projects",
  languages: "resume.languages",
  certificates: "resume.certificates",
};

const getSectionLabel = (section, trans) => {
  const key = SECTION_LABEL_KEYS[section?.type ?? section?.section];
  if (key) return trans(key);
  const raw = section?.title ?? section?.section ?? section?.type ?? "";
  return typeof raw === "string" ? raw.replace(/_/g, " ") : "";
};

const mapTailorResultToUI = (data, cvData, trans) => {
  if (data?.tailored_cv) return data.tailored_cv;
  const r = data?.result ?? {};
  const keywordTargets = Array.isArray(r.keyword_targets) ? r.keyword_targets : [];
  const sectionSuggestions = r.section_suggestions ?? {};
  const priorityActions = Array.isArray(r.priority_actions) ? r.priority_actions : [];
  const tailoredSummary = r.tailored_summary ?? "";

  const changes = [];
  const sections = cvData?.sections ?? [];
  for (const section of sections) {
    const suggestions = sectionSuggestions[section.type];
    if (Array.isArray(suggestions) && suggestions[0]) {
      const updated = suggestions[0];
      const original = typeof section.content === "string" ? section.content
        : (Array.isArray(section.items) ? section.items.map((i) => i.description).filter(Boolean).join("\n\n") : "");
      changes.push({
        section: section.type,
        sectionTitle: getSectionLabel(section, trans),
        original: original || trans("tailor.empty"),
        updated,
        reason: trans("tailor.aiSuggestionFor").replace(
          "{section}",
          section.title ?? getSectionLabel(section, trans)
        ),
      });
    }
  }
  if (tailoredSummary && !changes.some((c) => c.section === "summary")) {
    const summarySec = sections.find((s) => s.type === "summary");
    changes.unshift({
      section: "summary",
      sectionTitle: trans("resume.summary"),
      original: summarySec?.content ?? trans("tailor.empty"),
      updated: tailoredSummary,
      reason: trans("tailor.tailoredSummaryReason"),
    });
  }

  let tailoredCvData = null;
  if (cvData) {
    tailoredCvData = JSON.parse(JSON.stringify(cvData));
    const personalInfo = tailoredCvData.personal_info ?? {};
    tailoredCvData.personal_info = personalInfo;
    tailoredCvData.sections = (tailoredCvData.sections ?? []).map((sec) => {
      const suggestions = sectionSuggestions[sec.type];
      const summaryText = sec.type === "summary" && tailoredSummary ? tailoredSummary : (Array.isArray(suggestions) && suggestions[0] ? suggestions[0] : null);
      if (summaryText && sec.type === "summary") {
        return { ...sec, content: summaryText };
      }
      if (Array.isArray(suggestions) && suggestions[0] && sec.type !== "summary") {
        if (Array.isArray(sec.items) && sec.items[0]) {
          return { ...sec, items: sec.items.map((item, i) => ({
            ...item,
            description: suggestions[i] ?? suggestions[0] ?? item.description,
          })) };
        }
        if (sec.content !== undefined) return { ...sec, content: suggestions[0] };
      }
      return sec;
    });
  }

  const totalKws = keywordTargets.length;
  return {
    match_score: totalKws > 0 ? Math.min(90, 50 + totalKws * 5) : 0,
    keywords_matched: 0,
    keywords_total: totalKws,
    missing_keywords: keywordTargets,
    changes,
    recommendations: priorityActions,
    tailored_cv_data: tailoredCvData,
  };
};

/**
 * JobTailorModal
 *
 * Centered modal. Two steps:
 *   1. User fills in job title, company, job description
 *   2. Results: match score, changed sections, missing keywords, recommendations
 *
 * Calls POST /ai/tailor-for-job/
 * On accept → applies tailored_cv_data via onApplyTailored (suggest-only; user confirms)
 *
 * Props:
 *   cvId             — string (uuid)
 *   cvData           — current cv_data (for building tailored result and Apply)
 *   onClose          — () => void
 *   onApplyTailored  — (tailoredCvData: object) => void
 *   isPro            — Job Tailoring is Pro-only; free users see an upgrade explainer
 */

// ─── Match score badge ────────────────────────────────────────────────────────
const MatchScore = ({ score, trans }) => {
  const { textColor, bg, border, label } =
    score >= 80
      ? { textColor: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", label: trans("tailor.strongMatch") }
      : score >= 60
      ? { textColor: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   label: trans("tailor.decentMatch") }
      : { textColor: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",     label: trans("tailor.weakMatch")   };

  return (
    <div className={`flex items-center gap-4 p-5 rounded-2xl border ${bg} ${border}`}>
      <div>
        <p className={`text-4xl font-black ${textColor}`}>{score}%</p>
        <p className={`text-xs font-bold ${textColor} mt-0.5`}>{label}</p>
      </div>
      <div className="flex-1">
        <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-white">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-amber-400" : "bg-red-400"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-500 mt-1.5">
          {trans("tailor.matchedCvPercent").replace("{score}", String(score))}
        </p>
      </div>
    </div>
  );
};

// ─── Change card (expandable) ─────────────────────────────────────────────────
const ChangeCard = ({ change, trans }) => {
  const [open, setOpen] = useState(false);
  const sectionLabel =
    change.sectionTitle ??
    (SECTION_LABEL_KEYS[change.section]
      ? trans(SECTION_LABEL_KEYS[change.section])
      : change.section?.replace(/_/g, " "));
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div>
          <p className="text-xs font-bold text-gray-700 capitalize">
            {sectionLabel}
          </p>
          {change.reason && (
            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{change.reason}</p>
          )}
        </div>
        <ChevronRight
          size={14}
          className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="p-4 space-y-3 border-t border-gray-100">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">{trans("tailor.original")}</p>
            <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 leading-relaxed">
              {change.original}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1.5">{trans("tailor.updated")}</p>
            <p className="text-xs text-gray-800 bg-emerald-50 rounded-xl p-3 leading-relaxed">
              {change.updated}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Input field ──────────────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
      {label} {required && <span className="text-red-400 font-normal">*</span>}
    </label>
    {children}
  </div>
);

const inputClass =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors";

// ─── Main component ───────────────────────────────────────────────────────────
const STEP_INPUT   = "input";
const STEP_RESULTS = "results";

const JobTailorModal = ({ cvId, cvData, onClose, onApplyTailored, isPro = true }) => {
  const { t: trans, language } = useLanguage();
  const navigate = useNavigate();
  const [step,           setStep]           = useState(STEP_INPUT);
  const [jobTitle,       setJobTitle]       = useState("");
  const [company,        setCompany]        = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading,        setLoading]        = useState(false);
  const [result,         setResult]         = useState(null);
  const [error,          setError]          = useState(null);
  const [upgradeNotice,  setUpgradeNotice]  = useState(null);

  const handleTailor = async () => {
    if (!jobDescription.trim()) return;
    setLoading(true);
    setError(null);
    setUpgradeNotice(null);

    const { data, error: err } = await tailorForJobAPI({
      cvId,
      jobTitle,
      company,
      jobDescription,
      language,
    });

    setLoading(false);

    if (err) {
      if (err.upgrade_required) {
        setUpgradeNotice(trans("tailor.blockedOnPlan"));
      } else {
        setError(err.detail ?? err.error ?? trans("tailor.failed"));
      }
      return;
    }

    const mapped = mapTailorResultToUI(data, cvData, trans);
    setResult(mapped);
    setStep(STEP_RESULTS);
  };

  const handleApply = () => {
    if (result?.tailored_cv_data) {
      onApplyTailored(result.tailored_cv_data);
    }
    onClose();
  };

  const handleRetry = () => {
    setStep(STEP_INPUT);
    setResult(null);
    setError(null);
    setUpgradeNotice(null);
  };

  if (!isPro) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
        style={{ backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col"
          style={{ maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-base font-black text-gray-900">{trans("tailor.title")}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-10 flex flex-col items-center justify-center min-h-[260px]">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-5">
              <Target className="w-7 h-7 text-sky-600" />
            </div>
            <p className="text-base font-black text-gray-900 text-center mb-2 px-2">
              {trans("tailor.proOnlyTitle")}
            </p>
            <p className="text-sm text-gray-500 text-center leading-relaxed max-w-md">
              {trans("tailor.proOnlyDescription")}
            </p>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 shrink-0 space-y-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/pricing");
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 active:scale-[0.98] transition-all"
            >
              {trans("tailor.upgradeCta")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium"
            >
              {trans("ats.maybeLater")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const t = result; // shorthand

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      style={{ backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-base font-black text-gray-900">{trans("tailor.title")}</p>
              {step === STEP_RESULTS && t && (
                <p className="text-[11px] text-gray-400">
                  {(t.changes?.length ?? 0) === 1
                    ? trans("tailor.oneSectionUpdated")
                    : trans("tailor.sectionsUpdatedCount").replace(
                        "{count}",
                        String(t.changes?.length ?? 0)
                      )}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step 1: Input ── */}
          {step === STEP_INPUT && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 leading-relaxed">{trans("tailor.intro")}</p>

              <div className="grid grid-cols-2 gap-3">
                <Field label={trans("tailor.jobTitle")}>
                  <input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder={trans("tailor.placeholderJobTitle")}
                    className={inputClass}
                  />
                </Field>
                <Field label={trans("tailor.company")}>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder={trans("tailor.placeholderCompany")}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label={`${trans("tailor.jobDescription")} *`} required>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder={trans("tailor.placeholderJobDescription")}
                  rows={9}
                  className={`${inputClass} rounded-2xl resize-none leading-relaxed`}
                />
              </Field>

              {upgradeNotice && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
                  <p className="text-sm text-amber-950 leading-relaxed">{upgradeNotice}</p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate("/pricing");
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-900 text-white text-xs font-bold hover:bg-amber-800 transition-colors"
                  >
                    {trans("tailor.upgradeCta")}
                  </button>
                </div>
              )}

              {error && !upgradeNotice && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Results ── */}
          {step === STEP_RESULTS && t && (
            <div className="space-y-5">

              <MatchScore score={t.match_score} trans={trans} />

              {/* Keyword stats grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: trans("tailor.matched"),  value: t.keywords_matched,            color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
                  { label: trans("tailor.total"),    value: t.keywords_total,              color: "text-gray-700",    bg: "bg-gray-50 border-gray-100"       },
                  { label: trans("tailor.missing"),  value: t.missing_keywords?.length ?? 0, color: "text-amber-600", bg: "bg-amber-50 border-amber-100"     },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`p-3 rounded-2xl border ${bg} text-center`}>
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className={`text-[10px] font-bold ${color} mt-0.5 uppercase tracking-wide`}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Missing keywords */}
              {t.missing_keywords?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    {trans("tailor.considerKeywords")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.missing_keywords.map((kw) => (
                      <span key={kw} className="text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section changes */}
              {t.changes?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {t.changes.length === 1
                      ? trans("tailor.oneSectionUpdatedHeader")
                      : trans("tailor.sectionsUpdatedHeader").replace(
                          "{count}",
                          String(t.changes.length)
                        )}
                  </p>
                  {t.changes.map((change, i) => (
                    <ChangeCard key={i} change={change} trans={trans} />
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {t.recommendations?.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    {trans("tailor.recommendations")}
                  </p>
                  {t.recommendations.map((rec, i) => (
                    <p key={i} className="text-xs text-blue-700 flex gap-2">
                      <span className="shrink-0 mt-0.5">•</span> {rec}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 space-y-2">
          {step === STEP_INPUT ? (
            <button
              onClick={handleTailor}
              disabled={loading || !jobDescription.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> {trans("tailor.tailoring")}</>
                : trans("tailor.tailorMyCv")
              }
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleApply}
                disabled={!result?.tailored_cv_data}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={15} /> {trans("tailor.applyChanges")}
              </button>
              <button
                onClick={handleRetry}
                className="w-12 flex items-center justify-center rounded-2xl border border-gray-200 text-gray-400 hover:bg-gray-50 transition-all"
                title={trans("tailor.tryAgain")}
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                {trans("tailor.discard")}
              </button>
            </div>
          )}
          <p className="text-[10px] text-gray-300 text-center">
            {trans("tailor.footerUsageNote")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default JobTailorModal;