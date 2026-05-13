import React, { useState } from "react";
import {
  X, Sparkles, ChevronRight, Loader2,
  Check, RotateCcw, Pencil, AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { improveSectionAPI } from "../../services/aiService";

/**
 * AIImprovePanel
 *
 * Spec (section 9.4) requires:
 *   ✅ Original content block
 *   ✅ AI Improved Version block
 *   ✅ "Why This is Better" explanation
 *   ✅ Apply Suggestions button
 *   ✅ Edit Before Applying
 *   ✅ Reject button
 *   ✅ Try Different Version (regenerate)
 *   ✅ Free users can use it (5/section)
 *   ✅ 403 upgrade_required → inline limit view, not frontend gate
 *   ✅ language forwarded to API so LLM responds in the active UI language
 *
 * Props:
 *   resumeData  — full resume object
 *   language    — "en" | "ka"  (passed from parent; also read from useLanguage)
 *   onClose     — () => void
 *   onApply     — (sectionId: string, content: string) => void
 */

// ─── Which sections can be improved ──────────────────────────────────────────
const IMPROVABLE = {
  summary:      "Professional Summary",
  experience:   "Work Experience",
  education:    "Education",
  projects:     "Projects",
};

// Pull plain text from a section regardless of its shape
const getContent = (section) => {
  // 1. Plain-string sections (summary, custom text)
  if (typeof section.content === "string" && section.content.trim()) {
    return section.content.trim();
  }

  // 2. Structured sections — serialize items based on type
  if (Array.isArray(section.items) && section.items.length > 0) {
    const text = section.items
      .map((item) => {
        switch (section.type) {
          case "skills":
            return item.name || item.skill || item.description || "";

          case "experience":
            return [
              [item.position, item.company].filter(Boolean).join(" — "),
              [item.startDate, item.endDate].filter(Boolean).join(" – "),
              item.location,
              item.description,
              Array.isArray(item.bullets) ? item.bullets.map(b => `• ${b}`).join("\n") : "",
            ].filter(Boolean).join("\n");

          case "education":
            return [
              [item.degree, item.field].filter(Boolean).join(", "),
              item.school || item.institution,
              [item.startDate, item.endDate].filter(Boolean).join(" – "),
              item.gpa && `GPA: ${item.gpa}`,
              item.description,
            ].filter(Boolean).join("\n");

          case "projects":
            return [
              item.name || item.title,
              item.technologies && `Tech: ${item.technologies}`,
              item.description,
              item.link,
            ].filter(Boolean).join("\n");

          case "certificates":
            return [
              item.name,
              item.issuer,
              [item.startDate || item.start, item.endDate || item.end || item.date].filter(Boolean).join(" – "),
              item.description,
            ].filter(Boolean).join("\n");

          default:
            return item.description || item.name || item.title || "";
        }
      })
      .filter((block) => block && block.trim())
      .join("\n\n");

    if (text.trim()) return text;
  }

  // 3. Fallback
  return (section.description || "").trim();
};

// ─── Internal view states ─────────────────────────────────────────────────────
const VIEW_LIST   = "list";
const VIEW_LOAD   = "loading";
const VIEW_RESULT = "result";
const VIEW_LIMIT  = "limit";

// ─── Section list row ─────────────────────────────────────────────────────────
const SectionRow = ({ section, onSelect, t }) => (
  <button
    onClick={() => onSelect(section)}
    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-gray-100
               bg-gray-50 hover:bg-white hover:border-gray-300 hover:shadow-sm
               transition-all text-left group"
  >
    <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center
                    justify-center shrink-0 group-hover:border-amber-200 group-hover:bg-amber-50
                    transition-all">
      <Sparkles size={14} className="text-gray-300 group-hover:text-amber-500 transition-colors" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-800">
        {IMPROVABLE[section.type] ?? section.title ?? section.type}
      </p>
      <p className="text-[11px] text-gray-400 mt-0.5">{t("improve.clickToImprove")}</p>
    </div>
    <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
  </button>
);

// ─── Loading view ─────────────────────────────────────────────────────────────
const LoadingView = ({ sectionName, t }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-5">
    <div className="relative">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
        <Sparkles size={24} className="text-amber-500" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
        <Loader2 size={14} className="text-amber-500 animate-spin" />
      </div>
    </div>
    <div className="text-center">
      <p className="text-sm font-bold text-gray-800">
        {t("improve.improving").replace("{section}", sectionName)}
      </p>
      <p className="text-xs text-gray-400 mt-1">{t("improve.gptRewriting")}</p>
      <p className="text-[11px] text-gray-300 mt-1">{t("improve.usuallyTakes")}</p>
    </div>
  </div>
);

// ─── Result view ──────────────────────────────────────────────────────────────
// All wrapper labels (Original Content, AI Improved Version, Why This is Better,
// button text, tips) are localised via t(). The AI content itself (result.*) is
// already returned in the correct language by the backend.
const ResultView = ({
  section,
  result,
  isEditing,
  editedContent,
  onEditedContentChange,
  onStartEdit,
  onCancelEdit,
  onAccept,
  onDiscard,
  onRetry,
  isLoading,
  t,
}) => (
  <div className="space-y-4">

    {/* Back breadcrumb */}
    <button
      onClick={onDiscard}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
    >
      <ChevronRight size={13} className="rotate-180" />
      {t("improve.backToSections")}
    </button>

    {/* Section label */}
    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-0.5">
      ✨ {t("improve.suggestionsFor").replace("{section}", IMPROVABLE[section.type] ?? section.title)}
    </p>

    {/* ── Original Content ── */}
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-0.5">
        {t("improve.originalContent")}
      </p>
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-500
                      whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
        {result.original_content}
      </div>
    </div>

    {/* ── AI Improved Version ── */}
    <div>
      <div className="flex items-center justify-between mb-2 px-0.5">
        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
          ⭐ {t("improve.aiImprovedVersion")}
        </p>
        {!isEditing ? (
          <button
            onClick={onStartEdit}
            className="flex items-center gap-1 text-[10px] font-semibold text-gray-400
                       hover:text-gray-700 transition-colors"
          >
            <Pencil size={10} /> {t("improve.editBeforeApplying")}
          </button>
        ) : (
          <button
            onClick={onCancelEdit}
            className="text-[10px] font-semibold text-gray-400 hover:text-red-500 transition-colors"
          >
            {t("improve.cancelEdit")}
          </button>
        )}
      </div>

      {isEditing ? (
        <textarea
          value={editedContent}
          onChange={(e) => onEditedContentChange(e.target.value)}
          rows={7}
          autoFocus
          className="w-full p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-sm
                     text-gray-800 whitespace-pre-wrap leading-relaxed focus:outline-none
                     focus:border-emerald-400 resize-none transition-colors"
        />
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-gray-800
                        whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
          {result.improved_content}
        </div>
      )}
    </div>

    {/* ── "Why This is Better" — API explanation field, label is localised ── */}
    {result.explanation && !isEditing && (
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">
          ✓ {t("improve.whyBetter")}
        </p>
        {/* explanation text comes from the LLM — already in the active language */}
        <p className="text-xs text-blue-700 leading-relaxed">
          {result.explanation}
        </p>
      </div>
    )}

    {/* ── Actions ── */}
    <div className="space-y-2 pt-1">
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-900
                     text-white text-sm font-bold hover:bg-gray-700 active:scale-[0.98] transition-all"
        >
          <Check size={14} />
          {isEditing ? t("improve.applyEditedVersion") : t("improve.applySuggestions")}
        </button>
        <button
          onClick={() => onRetry(section)}
          disabled={isLoading}
          title={t("improve.tryDifferentVersion")}
          className="w-11 flex items-center justify-center rounded-2xl border border-gray-200
                     text-gray-400 hover:bg-gray-50 transition-all disabled:opacity-40"
        >
          {isLoading
            ? <Loader2 size={14} className="animate-spin" />
            : <RotateCcw size={14} />
          }
        </button>
      </div>
      <button
        onClick={onDiscard}
        className="w-full py-2.5 rounded-2xl border border-gray-200 text-gray-500 text-sm
                   font-semibold hover:bg-gray-50 transition-all"
      >
        {t("improve.reject")}
      </button>
    </div>

    <p className="text-[10px] text-gray-400 text-center pt-1">
      {t("improve.editTip")}
    </p>
  </div>
);

// ─── Limit view ───────────────────────────────────────────────────────────────
const LimitView = ({ sectionName, onClose, onGoBack, t }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center text-center py-8 px-2 gap-5">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
        <AlertCircle size={22} className="text-amber-600" />
      </div>
      <div>
        <p className="text-sm font-black text-gray-900 mb-2">
          {t("improve.sectionLimitReached")}
        </p>
        <p className="text-xs text-gray-500 leading-relaxed">
          {t("improve.limitDescription")
            .replace("{sectionName}", sectionName)}
        </p>
      </div>

      <div className="w-full p-4 bg-amber-50 border border-amber-100 rounded-2xl text-left space-y-2">
        {[
          t("improve.limitPerk1"),
          t("improve.limitPerk2"),
          t("improve.limitPerk3"),
        ].map((perk, i) => (
          <p key={i} className="text-xs text-amber-800 flex items-start gap-2">
            <Check size={11} className="shrink-0 mt-0.5 text-amber-600" />
            {perk}
          </p>
        ))}
      </div>

      <button
        onClick={() => { onClose(); navigate("/pricing"); }}
        className="w-full py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-bold
                   hover:bg-gray-700 active:scale-[0.98] transition-all flex items-center
                   justify-center gap-2"
      >
        <Sparkles size={14} className="text-amber-400" />
        {t("improve.viewProPlans")}
      </button>
      <button
        onClick={onGoBack}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        {t("improve.tryDifferentSection")}
      </button>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const AIImprovePanel = ({ resumeData, language: languageProp, cvId, onClose, onApply }) => {
  // Prefer the prop passed by the parent; fall back to context for safety.
  // This guarantees the language is always available even if the parent forgets
  // to pass it explicitly.
  const { t, language: langCtx } = useLanguage();
  const language = languageProp ?? langCtx ?? "en";

  const [view,          setView]          = useState(VIEW_LIST);
  const [activeSection, setActiveSection] = useState(null);
  const [result,        setResult]        = useState(null);
  const [isLoading,     setIsLoading]     = useState(false);
  const [error,         setError]         = useState(null);

  const [isEditing,     setIsEditing]     = useState(false);
  const [editedContent, setEditedContent] = useState("");

  const improvable = (resumeData?.sections ?? []).filter((s) => IMPROVABLE[s.type]);

  // ── Call the API ────────────────────────────────────────────────────────────
  const runImprove = async (section) => {
      console.log("Section being improved:", JSON.stringify(section, null, 2));
    console.log("Extracted content:", getContent(section));
    setActiveSection(section);
    setResult(null);
    setError(null);
    setIsEditing(false);
    setEditedContent("");
    setView(VIEW_LOAD);
    setIsLoading(true);

    const { data, error: err } = await improveSectionAPI({
      cvId,
      sectionType:  section.type,
      content:      getContent(section),
      // Pass language as a top-level param (backend serializer field).
      // This is what triggers the LLM to respond in Georgian vs English.
      language,
      context: {
        job_title: resumeData?.personalInfo?.jobTitle ?? "",
        company:   "",
      },
    });

    setIsLoading(false);

    if (err) {
      if (err.upgrade_required) {
        setView(VIEW_LIMIT);
        return;
      }
      setError(err.error ?? "Something went wrong. Please try again.");
      setView(VIEW_RESULT);
      return;
    }

    const improved = data?.improved_content ?? data?.result?.improved_text ?? data?.improved_text ?? "";
    const original = data?.original_content ?? getContent(section);
    setResult({ ...data, improved_content: improved, original_content: original });
    setEditedContent(improved);
    setView(VIEW_RESULT);
  };

  // ── Accept ──────────────────────────────────────────────────────────────────
  const handleAccept = () => {
    const contentToApply = isEditing
      ? editedContent
      : (result.improved_content ?? result.result?.improved_text ?? result.improved_text ?? "");
    onApply(activeSection.id, contentToApply);
    setView(VIEW_LIST);
    setResult(null);
    setActiveSection(null);
    setIsEditing(false);
  };

  // ── Discard / back ──────────────────────────────────────────────────────────
  const handleDiscard = () => {
    setView(VIEW_LIST);
    setResult(null);
    setActiveSection(null);
    setError(null);
    setIsEditing(false);
    setEditedContent("");
  };

  const headerSubtitle = {
    [VIEW_LIST]:   t("improve.pickSection"),
    [VIEW_LOAD]:   t("improve.generatingSuggestion"),
    [VIEW_RESULT]: t("improve.reviewBeforeApplying"),
    [VIEW_LIMIT]:  t("improve.upgradeToContinue"),
  };

  return (
    <div className="fixed inset-0 z-[90] flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30"
        style={{ backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="w-full max-w-[430px] bg-white h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Sparkles size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900">{t("improve.title")}</p>
              <p className="text-[10px] text-gray-400">{headerSubtitle[view]}</p>
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
        <div className="flex-1 overflow-y-auto p-5">

          {/* API error (non-limit errors) */}
          {error && view === VIEW_RESULT && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm
                            text-red-600 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Section list */}
          {view === VIEW_LIST && (
            improvable.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <Sparkles size={20} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 font-medium">{t("improve.noSections")}</p>
                <p className="text-xs text-gray-400">{t("improve.addContentFirst")}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  {t("improve.pickSectionDesc")}
                </p>
                {improvable.map((section) => (
                  <SectionRow key={section.id} section={section} onSelect={runImprove} t={t} />
                ))}
              </div>
            )
          )}

          {/* Loading */}
          {view === VIEW_LOAD && (
            <LoadingView
              sectionName={IMPROVABLE[activeSection?.type] ?? activeSection?.title ?? t("improve.section")}
              t={t}
            />
          )}

          {/* Result */}
          {view === VIEW_RESULT && result && activeSection && (
            <ResultView
              section={activeSection}
              result={result}
              isEditing={isEditing}
              editedContent={editedContent}
              onEditedContentChange={setEditedContent}
              onStartEdit={() => setIsEditing(true)}
              onCancelEdit={() => { setIsEditing(false); setEditedContent(result.improved_content); }}
              onAccept={handleAccept}
              onDiscard={handleDiscard}
              onRetry={runImprove}
              isLoading={isLoading}
              t={t}
            />
          )}

          {/* Limit reached */}
          {view === VIEW_LIMIT && (
            <LimitView
              sectionName={IMPROVABLE[activeSection?.type] ?? activeSection?.title ?? t("improve.thisSection")}
              onClose={onClose}
              onGoBack={handleDiscard}
              t={t}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 shrink-0">
          <p className="text-[10px] text-gray-300 text-center">
            {view === VIEW_LIST
              ? t("improve.freeVsProNote")
              : t("improve.poweredByNote")
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIImprovePanel;