import React, { useState, useEffect } from "react";
import {
  X,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
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
const mapCheckATSResultToUI = (data, t) => {
  if (data?.ats_analysis) return data.ats_analysis;
  const r = data?.result ?? {};
  const issues = Array.isArray(r.issues) ? r.issues : [];
  const keywordGaps = Array.isArray(r.keyword_gaps) ? r.keyword_gaps : [];
  const formatRecs = Array.isArray(r.format_recommendations) ? r.format_recommendations : [];
  const sectionRecs = Array.isArray(r.section_recommendations) ? r.section_recommendations : [];
  const keywordList = keywordGaps.slice(0, 5).join(", ");
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
      recommendation: keywordGaps.length && t
        ? t("ats.considerAdding").replace("{keywords}", keywordList)
        : null,
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
    actionable_fixes: actionableFixes.length ? actionableFixes : (keywordGaps.length && t ? keywordGaps.slice(0, 5).map((kw) => ({
      category: "keywords",
      issue: `${t("ats.missing")}: ${kw}`,
      solution: "",
      priority: "medium",
    })) : []),
  };
};

const translatePriority = (level, t) => {
  const key = `ats.priority.${level}`;
  const label = t(key);
  return label !== key ? label : level;
};

const translateCategory = (category, t) => {
  if (!category) return "";
  const key = `ats.category.${category}`;
  const label = t(key);
  return label !== key ? label : category;
};

/** Build panel quota state from /me limits (used + limit; -1 limit = unlimited). */
const buildQuotaState = (used, limit) => {
  const lim = Number(limit);
  const u = Number(used) || 0;
  if (lim === -1) {
    return { used: u, limit: -1, remaining: -1, unlimited: true };
  }
  const cap = Number.isFinite(lim) ? lim : 20;
  return { used: u, limit: cap, remaining: Math.max(cap - u, 0), unlimited: false };
};

/** Normalize quota from check-ats API (success or 403). */
const mergeApiQuota = (apiQuota) => {
  const limit = apiQuota?.limit ?? 20;
  const used = apiQuota?.used_after ?? apiQuota?.used ?? 0;
  if (limit === -1) {
    return { used, limit: -1, remaining: -1, unlimited: true };
  }
  const remaining =
    typeof apiQuota?.remaining === "number"
      ? apiQuota.remaining
      : Math.max(limit - used, 0);
  return { used, limit, remaining, unlimited: false };
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
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────
const scoreTheme = (score, t) =>
  score >= 80
    ? { color: "#10b981", label: t("ats.scoreGreat"),      lightBg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-400", text: "text-emerald-700", pill: "bg-emerald-50 text-emerald-600 border-emerald-200" }
    : score >= 60
    ? { color: "#f59e0b", label: t("ats.scoreNeedsWork"), lightBg: "bg-amber-50",   border: "border-amber-200",   bar: "bg-amber-400",   text: "text-amber-700",   pill: "bg-amber-50 text-amber-600 border-amber-200"   }
    : { color: "#ef4444", label: t("ats.scorePoor"),       lightBg: "bg-red-50",     border: "border-red-200",     bar: "bg-red-400",     text: "text-red-700",     pill: "bg-red-50 text-red-600 border-red-200"         };

const priorityTheme = (level) => ({
  high:   { cls: "bg-red-50 text-red-600 border-red-200",     icon: <AlertCircle size={12} className="text-red-500" /> },
  medium: { cls: "bg-amber-50 text-amber-600 border-amber-200", icon: <Info size={12} className="text-amber-500" /> },
  low:    { cls: "bg-blue-50 text-blue-600 border-blue-200",    icon: <Info size={12} className="text-blue-400" /> },
}[level] ?? { cls: "bg-gray-50 text-gray-500 border-gray-200", icon: null });

// ─── Score Ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score, t }) => {
  const theme = scoreTheme(score, t);
  return (
    <div className={`flex flex-col items-center py-7 mx-auto rounded-3xl ${theme.lightBg} border ${theme.border} mb-1`}>
      <div
        className="w-28 h-28 rounded-full flex flex-col items-center justify-center border-[5px]"
        style={{ borderColor: theme.color }}
      >
        <span className="text-4xl font-black leading-none" style={{ color: theme.color }}>
          {score}
        </span>
        <span className="text-[11px] font-bold text-gray-400 tracking-wider">{t("ats.scoreOutOf")}</span>
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
const ScoreBar = ({ label, score, t }) => {
  const theme = scoreTheme(score, t);
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
const Priority = ({ level, t }) => {
  const { cls } = priorityTheme(level);
  return (
    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${cls} whitespace-nowrap`}>
      {translatePriority(level, t)}
    </span>
  );
};

// ─── Issue card (from API issues list) ────────────────────────────────────────
const IssueCard = ({ fix, t }) => (
  <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50 space-y-2">
    <div className="flex items-center gap-2 flex-wrap">
      <Priority level={fix.priority} t={t} />
      {fix.category && (
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          {translateCategory(fix.category, t)}
        </span>
      )}
    </div>
    <p className="text-sm font-semibold text-gray-800 leading-snug">{fix.issue}</p>
    {fix.solution ? (
      <p className="text-xs text-gray-500 leading-relaxed">{fix.solution}</p>
    ) : null}
    {fix.impact ? (
      <span className="inline-block text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
        {fix.impact}
      </span>
    ) : null}
  </div>
);

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
const FormattingIssue = ({ issue }) => {
  const severityColor = {
    critical: "text-red-600 bg-red-50 border-red-200",
    warning:  "text-amber-600 bg-amber-50 border-amber-200",
    info:     "text-blue-500 bg-blue-50 border-blue-200",
  }[issue.severity] ?? "text-gray-500 bg-gray-50 border-gray-200";

  return (
    <div className="py-2 border-b border-gray-100 last:border-0 space-y-0.5">
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
 * @param {boolean}  isPro           whether user has Pro+ access
 * @param {number}   checksUsed      how many ATS checks used this month
 * @param {number}   checksLimit     monthly limit (-1 = unlimited)
 * @param {Function} onChecksUpdated refresh user limits after a successful check
 * @param {Function} onBeforeCheck     async flush-save before running ATS
 */
const ATSPanel = ({
  cvId,
  onClose,
  onScoreUpdate,
  onBeforeCheck,
  onChecksUpdated,
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
  const [quota,      setQuota]      = useState(() => buildQuotaState(checksUsed, checksLimit));

  useEffect(() => {
    setQuota(buildQuotaState(checksUsed, checksLimit));
  }, [checksUsed, checksLimit]);

  const unlimited = quota.unlimited === true || quota.limit === -1;
  const checksRemaining = unlimited ? -1 : (quota.remaining ?? Math.max(0, (quota.limit ?? checksLimit) - (quota.used ?? checksUsed)));
  const checksLimitVal  = quota.limit ?? checksLimit;
  const limitReached    = !unlimited && checksRemaining <= 0;

  const runCheck = async () => {
    if (limitReached) return;
    setLoading(true);
    setError(null);

    try {
      if (onBeforeCheck) await onBeforeCheck();
    } catch {
      setLoading(false);
      setError(t("ats.checkFailed"));
      return;
    }

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
        if (err.quota) setQuota(mergeApiQuota(err.quota));
      } else {
        setError(err.detail ?? err.error ?? t("ats.checkFailed"));
      }
      return;
    }

    const analysis = mapCheckATSResultToUI(data, t);
    setAts(analysis);
    setRan(true);
    onScoreUpdate(analysis.overall_score);
    if (data?.quota) setQuota(mergeApiQuota(data.quota));
    onChecksUpdated?.();
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
              {unlimited
                ? t("ats.unlimited")
                : `${checksRemaining}/${checksLimitVal} ${t("ats.left")}`}
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
                  <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">{t("ats.targetRoleHint")}</p>
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
                {t("ats.usedAllChecks").replace("{n}", String(checksLimitVal))}
              </p>
              <button
                type="button"
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
              <ScoreRing score={ats.overall_score} t={t} />

              {/* Sub-scores only when API provides them (avoid misleading 0% bars) */}
              {(ats.formatting?.score != null ||
                ats.section_headers?.score != null ||
                ats.content_parsing?.score != null) && (
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("ats.scoreBreakdown")}</p>
                  {ats.keyword_optimization?.score != null && (
                    <ScoreBar label={t("ats.keywordOptimization")} score={ats.keyword_optimization.score} t={t} />
                  )}
                  {ats.formatting?.score != null && (
                    <ScoreBar label={t("ats.formattingSection")} score={ats.formatting.score} t={t} />
                  )}
                  {ats.section_headers?.score != null && (
                    <ScoreBar label={t("ats.sectionHeaders")} score={ats.section_headers.score} t={t} />
                  )}
                  {ats.content_parsing?.score != null && (
                    <ScoreBar label={t("ats.contentParsing")} score={ats.content_parsing.score} t={t} />
                  )}
                </div>
              )}

              {/* Keywords */}
              {ats.keyword_optimization && (
                <Section
                  title={t("ats.keywords")}
                  defaultOpen
                  badge={`${ats.keyword_optimization.found_keywords?.length ?? 0}/${
                    (ats.keyword_optimization.found_keywords?.length ?? 0) +
                    (ats.keyword_optimization.missing_keywords?.length ?? 0)
                  }`}
                >
                  {ats.keyword_optimization.found_keywords?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase mb-2">{t("ats.found")} ✓</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ats.keyword_optimization.found_keywords.map((kw) => (
                          <Chip key={kw} label={kw} variant="found" />
                        ))}
                      </div>
                    </div>
                  )}
                  {ats.keyword_optimization.missing_keywords?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-red-500 uppercase mb-2">{t("ats.missing")} ✗</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ats.keyword_optimization.missing_keywords.map((kw) => (
                          <Chip key={kw} label={kw} variant="missing" />
                        ))}
                      </div>
                    </div>
                  )}
                  {ats.keyword_optimization.keyword_density !== undefined && (
                    <p className="text-[11px] text-gray-400">
                      {t("ats.keywordDensity")}: <strong>{(ats.keyword_optimization.keyword_density * 100).toFixed(1)}%</strong>
                    </p>
                  )}
                  {ats.keyword_optimization.recommendation && (
                    <p className="text-xs text-gray-400 italic pt-1">
                      {ats.keyword_optimization.recommendation}
                    </p>
                  )}
                </Section>
              )}

              {/* Formatting recommendations */}
              {(ats.formatting?.issues?.length > 0 || ats.formatting?.recommendation) && (
                <Section
                  title={t("ats.formattingSection")}
                  badge={ats.formatting.issues?.length || undefined}
                >
                  {ats.formatting.issues?.map((issue, i) => (
                    <FormattingIssue key={i} issue={issue} />
                  ))}
                  {ats.formatting.recommendation && (
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                      {ats.formatting.recommendation}
                    </p>
                  )}
                </Section>
              )}

              {/* Section headers */}
              {(ats.section_headers?.non_standard_headers?.length > 0 || ats.section_headers?.recommendation) && (
                <Section title={t("ats.sectionHeaders")}>
                  {ats.section_headers.standard_headers?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase mb-2">{t("ats.standardHeaders")} ✓</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ats.section_headers.standard_headers.map((h) => (
                          <Chip key={h} label={h} variant="found" />
                        ))}
                      </div>
                    </div>
                  )}
                  {ats.section_headers.non_standard_headers?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase mb-2">{t("ats.renameThese")} ⚠</p>
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

              {/* Issues from API */}
              {ats.actionable_fixes?.length > 0 && (
                <Section
                  title={t("ats.issues")}
                  badge={ats.actionable_fixes.length}
                  defaultOpen
                >
                  {[...ats.actionable_fixes]
                    .sort((a, b) => {
                      const order = { high: 0, medium: 1, low: 2 };
                      return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
                    })
                    .map((fix, i) => (
                      <IssueCard key={i} fix={fix} t={t} />
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
              <><Loader2 size={15} className="animate-spin" /> {t("ats.analyzing")}</>
            ) : ran ? (
              <><RotateCcw size={15} /> {t("ats.rerunCheck")}</>
            ) : (
              t("ats.runCheck")
            )}
          </button>
          {!limitReached && (
            <p className="text-[10px] text-gray-300 text-center mt-2">
              {unlimited
                ? t("ats.unlimitedNote")
                : t("ats.usesRemaining").replace("{remaining}", String(checksRemaining))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ATSPanel;