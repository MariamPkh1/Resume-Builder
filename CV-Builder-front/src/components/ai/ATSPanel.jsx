import React, { useState, useCallback } from "react";
import {
  X,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Zap,
  CheckCircle2,
  AlertCircle,
  Info,
  BarChart2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { checkATSAPI } from "../../services/aiService";

/**
 * Maps backend check-ats response (Integration Guide Section 9C) to UI shape.
 * Backend returns: result { ats_score, issues, keyword_gaps, format_recommendations, section_recommendations }
 */
const mapCheckATSResultToUI = (data) => {
  if (data?.ats_analysis) return data.ats_analysis;
  const r = data?.result ?? {};
  const issues = Array.isArray(r.issues) ? r.issues : [];
  const keywordGaps = Array.isArray(r.keyword_gaps) ? r.keyword_gaps : [];
  const formatRecs = Array.isArray(r.format_recommendations) ? r.format_recommendations : [];
  const sectionRecs = Array.isArray(r.section_recommendations) ? r.section_recommendations : [];
  const actionableFixes = issues.map((i) => ({
    category: i.category ?? "content",
    issue: i.issue ?? i.description ?? String(i),
    solution: i.solution ?? i.fix ?? "",
    impact: i.impact,
    priority: i.priority ?? "medium",
  }));
  if (formatRecs.length > 0 && actionableFixes.length === 0) {
    formatRecs.forEach((rec) => actionableFixes.push({
      category: "formatting",
      issue: typeof rec === "string" ? rec : rec?.description ?? "",
      solution: typeof rec === "object" ? rec?.fix ?? "" : "",
      priority: "medium",
    }));
  }
  return {
    overall_score: r.ats_score ?? 0,
    keyword_optimization: {
      found_keywords: [],
      missing_keywords: keywordGaps,
      score: r.ats_score,
      recommendation: keywordGaps.length ? `Consider adding: ${keywordGaps.slice(0, 5).join(", ")}` : null,
    },
    formatting: {
      issues: issues.filter((i) => i.severity).map((i) => ({
        severity: i.severity ?? "warning",
        description: i.issue ?? i.description ?? "",
        fix: i.solution ?? i.fix,
      })),
      recommendation: formatRecs.join(" ") || null,
    },
    section_headers: {
      standard_headers: [],
      non_standard_headers: [],
      recommendation: sectionRecs.length ? sectionRecs.join(" ") : null,
    },
    actionable_fixes: actionableFixes.length ? actionableFixes : (keywordGaps.length ? keywordGaps.slice(0, 5).map((kw) => ({
      category: "keywords",
      issue: `Missing keyword: ${kw}`,
      solution: `Add "${kw}" to your CV where relevant.`,
      priority: "medium",
    })) : []),
  };
};

/**
 * ATSPanel
 *
 * Slide-in panel. Calls POST /ai/check-ats/ and maps result to UI shape.
 *
 * Props:
 *   cvId          — string (uuid from URL params)
 *   onClose       — () => void
 *   onScoreUpdate — (score: number) => void   bubbles score up to toolbar badge
 *   onQuickFix    — (fixType: string, fixData: object) => void
 *                   Called when user applies a quick fix to the CV editor.
 *                   fixType: "keyword" | "header" | "content"
 *                   fixData: { section, suggestion, keywords? }
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────
const scoreTheme = (score) =>
  score >= 80
    ? { color: "#10b981", label: "Great",      lightBg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-400", text: "text-emerald-700", pill: "bg-emerald-50 text-emerald-600 border-emerald-200" }
    : score >= 60
    ? { color: "#f59e0b", label: "Needs Work", lightBg: "bg-amber-50",   border: "border-amber-200",   bar: "bg-amber-400",   text: "text-amber-700",   pill: "bg-amber-50 text-amber-600 border-amber-200"   }
    : { color: "#ef4444", label: "Poor",       lightBg: "bg-red-50",     border: "border-red-200",     bar: "bg-red-400",     text: "text-red-700",     pill: "bg-red-50 text-red-600 border-red-200"         };

const priorityTheme = (level) => ({
  high:   { cls: "bg-red-50 text-red-600 border-red-200",     icon: <AlertCircle size={12} className="text-red-500" /> },
  medium: { cls: "bg-amber-50 text-amber-600 border-amber-200", icon: <Info size={12} className="text-amber-500" /> },
  low:    { cls: "bg-blue-50 text-blue-600 border-blue-200",    icon: <Info size={12} className="text-blue-400" /> },
}[level] ?? { cls: "bg-gray-50 text-gray-500 border-gray-200", icon: null });

// ─── Score Ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const theme = scoreTheme(score);
  return (
    <div className={`flex flex-col items-center py-7 mx-auto rounded-3xl ${theme.lightBg} border ${theme.border} mb-1`}>
      <div
        className="w-28 h-28 rounded-full flex flex-col items-center justify-center border-[5px]"
        style={{ borderColor: theme.color }}
      >
        <span className="text-4xl font-black leading-none" style={{ color: theme.color }}>
          {score}
        </span>
        <span className="text-[11px] font-bold text-gray-400 tracking-wider">/ 100</span>
      </div>
      <span
        className="mt-4 text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full"
        style={{ color: theme.color, backgroundColor: theme.color + "22" }}
      >
        {theme.label}
      </span>
    </div>
  );
};

// ─── Score Bar ────────────────────────────────────────────────────────────────
const ScoreBar = ({ label, score }) => {
  const theme = scoreTheme(score);
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-900">{score}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${theme.bar} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

// ─── Priority Pill ────────────────────────────────────────────────────────────
const Priority = ({ level }) => {
  const { cls } = priorityTheme(level);
  return (
    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${cls} whitespace-nowrap`}>
      {level}
    </span>
  );
};

// ─── Quick Fix Button ─────────────────────────────────────────────────────────
const QuickFixButton = ({ onClick, applied }) =>
  applied ? (
    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
      <CheckCircle2 size={13} />
      Applied
    </div>
  ) : (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 hover:border-gray-400 hover:bg-gray-50 px-3 py-1.5 rounded-xl transition-all active:scale-95 whitespace-nowrap"
    >
      <Zap size={12} className="text-amber-500" />
      Quick Fix
    </button>
  );

// ─── Fix Card ─────────────────────────────────────────────────────────────────
const FixCard = ({ fix, index, onQuickFix }) => {
  const [applied, setApplied] = useState(false);

  const handleQuickFix = useCallback(() => {
    // Build a fixData payload for the CV editor to consume.
    // The parent's onQuickFix handler decides how to apply it.
    const fixData = {
      category: fix.category ?? "content",
      issue:    fix.issue,
      solution: fix.solution,
      impact:   fix.impact,
      priority: fix.priority,
    };
    onQuickFix("fix", fixData);
    setApplied(true);
  }, [fix, onQuickFix]);

  return (
    <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Priority level={fix.priority} />
            {fix.category && (
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                {fix.category}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-800 leading-snug">{fix.issue}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{fix.solution}</p>
      <div className="flex items-center justify-between gap-2 pt-1">
        {fix.impact ? (
          <span className="inline-block text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
            {fix.impact}
          </span>
        ) : (
          <span />
        )}
        <QuickFixButton onClick={handleQuickFix} applied={applied} />
      </div>
    </div>
  );
};

// ─── Collapsible Section ──────────────────────────────────────────────────────
const Section = ({ title, defaultOpen = false, badge, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/80 hover:bg-gray-100 transition-colors text-left gap-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{title}</span>
          {badge !== undefined && (
            <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp   size={14} className="text-gray-400 shrink-0" />
          : <ChevronDown size={14} className="text-gray-400 shrink-0" />
        }
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
};

// ─── Keyword Chip ─────────────────────────────────────────────────────────────
const Chip = ({ label, variant }) => {
  const s = variant === "found"
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : "bg-red-50 text-red-600 border-red-100";
  return (
    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${s}`}>
      {label}
    </span>
  );
};

// ─── Formatting Issue Row ─────────────────────────────────────────────────────
const FormattingIssue = ({ issue, onQuickFix }) => {
  const [applied, setApplied] = useState(false);
  const severityColor = {
    critical: "text-red-600 bg-red-50 border-red-200",
    warning:  "text-amber-600 bg-amber-50 border-amber-200",
    info:     "text-blue-500 bg-blue-50 border-blue-200",
  }[issue.severity] ?? "text-gray-500 bg-gray-50 border-gray-200";

  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="space-y-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${severityColor}`}>
            {issue.severity}
          </span>
        </div>
        <p className="text-xs text-gray-700 font-medium">{issue.description}</p>
        {issue.fix && (
          <p className="text-[11px] text-gray-400 leading-relaxed">{issue.fix}</p>
        )}
      </div>
      {onQuickFix && (
        <QuickFixButton
          applied={applied}
          onClick={() => {
            onQuickFix("formatting", { description: issue.description, fix: issue.fix, severity: issue.severity });
            setApplied(true);
          }}
        />
      )}
    </div>
  );
};

// ─── Upgrade Gate ─────────────────────────────────────────────────────────────
const UpgradeGate = ({ onClose, onUpgrade, t }) => (
  <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center gap-5">
    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
      <BarChart2 size={22} className="text-gray-700" />
    </div>
    <div>
      <p className="text-base font-black text-gray-900 mb-1">{t("ats.proFeature")}</p>
      <p className="text-sm text-gray-500 leading-relaxed">{t("ats.upgradeToPro")}</p>
    </div>
    <button
      onClick={() => { onClose(); onUpgrade?.(); }}
      className="w-full py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-all"
    >
      {t("ats.upgradeToProButton")}
    </button>
    <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
      {t("ats.maybeLater")}
    </button>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * @param {string}   cvId            CV uuid
 * @param {Function} onClose         close handler
 * @param {Function} onScoreUpdate   (score: number) → update toolbar badge
 * @param {Function} onQuickFix      (fixType: string, fixData: object) → apply to CV editor
 * @param {boolean}  isPro           whether user has Pro+ access
 * @param {number}   checksUsed      how many ATS checks used this month
 * @param {number}   checksLimit     monthly limit (default 20 for Pro)
 */
const ATSPanel = ({
  cvId,
  onClose,
  onScoreUpdate,
  onQuickFix = () => {},
  isPro = true,
  checksUsed = 0,
  checksLimit = 20,
}) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [loading,    setLoading]    = useState(false);
  const [ats,        setAts]        = useState(null);
  const [error,      setError]      = useState(null);
  const [ran,        setRan]        = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [industry,   setIndustry]   = useState("");
  const [quota,      setQuota]      = useState({ remaining: Math.max(0, checksLimit - checksUsed), limit: checksLimit });

  const checksRemaining = quota.remaining ?? Math.max(0, quota.limit - checksUsed);
  const checksLimitVal  = quota.limit ?? checksLimit;
  const limitReached    = checksRemaining <= 0;

  const runCheck = async () => {
    if (limitReached) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await checkATSAPI({
      cvId,
      targetRole,
      industry,
      language,
    });

    setLoading(false);

    if (err) {
      if (err.upgrade_required) {
        setError(err.detail ?? t("ats.checkProFeature"));
        if (err.quota) setQuota({ remaining: err.quota.remaining ?? 0, limit: err.quota.limit ?? 20 });
      } else {
        setError(err.detail ?? err.error ?? t("ats.checkFailed"));
      }
      return;
    }

    const analysis = mapCheckATSResultToUI(data);
    setAts(analysis);
    setRan(true);
    onScoreUpdate(analysis.overall_score);
    if (data?.quota) setQuota({ remaining: data.quota.remaining ?? 0, limit: data.quota.limit ?? 20 });
  };

  // Show upgrade wall for free users
  if (!isPro) {
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
              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-lg">📊</div>
              <p className="text-sm font-black text-gray-900">{t("ats.title")}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all">
              <X size={16} />
            </button>
          </div>
          <UpgradeGate onClose={onClose} onUpgrade={() => navigate("/pricing")} t={t} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30"
        style={{ backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="w-full max-w-[440px] bg-white h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
  <BarChart2 size={22} className="text-gray-700" />
</div>
            <div>
              <p className="text-sm font-black text-gray-900">{t("ats.title")}</p>
              <p className="text-[10px] text-gray-400">{t("ats.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Usage counter */}
            <span className="text-[10px] font-bold text-gray-400">
              {checksRemaining}/{checksLimitVal} left
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Pre-run: explanation + context inputs */}
          {!ran && (
            <div className="p-5 space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl">
                <p className="text-xs text-purple-800 leading-relaxed">{t("ats.whatIs")}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    {t("ats.targetRole")}{" "}
                    <span className="text-gray-300 font-normal normal-case">({t("ats.targetRoleOptional")})</span>
                  </label>
                  <input
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder={t("ats.placeholderTargetRole")}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    {t("ats.industry")}{" "}
                    <span className="text-gray-300 font-normal normal-case">({t("ats.industryOptional")})</span>
                  </label>
                  <input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder={t("ats.placeholderIndustry")}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-5 mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Limit reached warning */}
          {limitReached && !ats && (
            <div className="mx-5 mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <p className="text-sm font-bold text-amber-700">{t("ats.monthlyLimitReached")}</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {t("ats.usedAllChecks").replace("{n}", checksLimitVal)}
              </p>
              <button
                onClick={() => navigate("/pricing")}
                className="mt-3 w-full py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-all"
              >
                {t("ats.upgradeToProfessional")}
              </button>
            </div>
          )}

          {/* Results */}
          {ats && (
            <div className="px-5 pt-4 pb-6 space-y-4">

              {/* Score ring */}
              <ScoreRing score={ats.overall_score} />

              {/* Breakdown bars */}
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Score Breakdown</p>
                <ScoreBar label="Keyword Optimization" score={ats.keyword_optimization?.score ?? 0} />
                <ScoreBar label="Formatting"           score={ats.formatting?.score ?? 0} />
                <ScoreBar label="Section Headers"      score={ats.section_headers?.score ?? 0} />
                <ScoreBar label="Content Parsing"      score={ats.content_parsing?.score ?? 0} />
              </div>

              {/* Keywords */}
              {ats.keyword_optimization && (
                <Section
                  title="Keywords"
                  defaultOpen
                  badge={`${ats.keyword_optimization.found_keywords?.length ?? 0}/${
                    (ats.keyword_optimization.found_keywords?.length ?? 0) +
                    (ats.keyword_optimization.missing_keywords?.length ?? 0)
                  }`}
                >
                  {ats.keyword_optimization.found_keywords?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase mb-2">Found ✓</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ats.keyword_optimization.found_keywords.map((kw) => (
                          <Chip key={kw} label={kw} variant="found" />
                        ))}
                      </div>
                    </div>
                  )}
                  {ats.keyword_optimization.missing_keywords?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-red-500 uppercase mb-2">Missing ✗</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ats.keyword_optimization.missing_keywords.map((kw) => (
                          <Chip key={kw} label={kw} variant="missing" />
                        ))}
                      </div>
                    </div>
                  )}
                  {ats.keyword_optimization.keyword_density !== undefined && (
                    <p className="text-[11px] text-gray-400">
                      Keyword density: <strong>{(ats.keyword_optimization.keyword_density * 100).toFixed(1)}%</strong>
                    </p>
                  )}
                  {ats.keyword_optimization.recommendation && (
                    <p className="text-xs text-gray-400 italic pt-1">
                      {ats.keyword_optimization.recommendation}
                    </p>
                  )}
                </Section>
              )}

              {/* Formatting issues */}
              {ats.formatting?.issues?.length > 0 && (
                <Section title="Formatting Issues" badge={ats.formatting.issues.length}>
                  {ats.formatting.issues.map((issue, i) => (
                    <FormattingIssue
                      key={i}
                      issue={issue}
                      onQuickFix={onQuickFix}
                    />
                  ))}
                  {ats.formatting.recommendation && (
                    <p className="text-xs text-gray-400 italic pt-1">{ats.formatting.recommendation}</p>
                  )}
                </Section>
              )}

              {/* Section headers */}
              {(ats.section_headers?.non_standard_headers?.length > 0 || ats.section_headers?.recommendation) && (
                <Section title="Section Headers">
                  {ats.section_headers.standard_headers?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase mb-2">Standard ✓</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ats.section_headers.standard_headers.map((h) => (
                          <Chip key={h} label={h} variant="found" />
                        ))}
                      </div>
                    </div>
                  )}
                  {ats.section_headers.non_standard_headers?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase mb-2">Rename These ⚠</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ats.section_headers.non_standard_headers.map((h) => (
                          <span
                            key={h}
                            className="text-[11px] bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {ats.section_headers.recommendation && (
                    <p className="text-xs text-gray-400 italic">{ats.section_headers.recommendation}</p>
                  )}
                </Section>
              )}

              {/* Actionable fixes — the main Quick Fix list */}
              {ats.actionable_fixes?.length > 0 && (
                <Section
                  title="Fixes to Apply"
                  badge={ats.actionable_fixes.length}
                  defaultOpen
                >
                  {/* Sort: high → medium → low */}
                  {[...ats.actionable_fixes]
                    .sort((a, b) => {
                      const order = { high: 0, medium: 1, low: 2 };
                      return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
                    })
                    .map((fix, i) => (
                      <FixCard key={i} fix={fix} index={i} onQuickFix={onQuickFix} />
                    ))}
                </Section>
              )}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={runCheck}
            disabled={loading || limitReached}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin" /> Analyzing…</>
            ) : ran ? (
              <><RotateCcw size={15} /> {t("ats.rerunCheck")}</>
            ) : (
              t("ats.runCheck")
            )}
          </button>
          {!limitReached && (
            <p className="text-[10px] text-gray-300 text-center mt-2">
              Uses 1 of your {checksRemaining} remaining checks this month
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ATSPanel;