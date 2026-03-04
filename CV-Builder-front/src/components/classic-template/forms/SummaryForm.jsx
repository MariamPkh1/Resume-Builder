import React, { useState } from "react";
import { FileText, Sparkles, X, Loader2, Check, GripVertical } from "lucide-react";
import { improveSectionAPI } from "../../../services/aiService";
import { useLanguage } from "../../../context/LanguageContext";

const SummaryForm = ({ section, setResumeData, cvId, dragHandleProps, onDeleteSection }) => {
  const { t, language } = useLanguage();
  const [isImproving, setIsImproving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiError, setAiError] = useState(null);

  const handleAIImprove = async () => {
    if (!section.content || section.content.length < 10) return;
    setIsImproving(true);
    setAiError(null);
    setAiSuggestion(null);
    try {
      const { data, error } = await improveSectionAPI({
        cvId,
        sectionType: "summary",
        content: section.content,
        context: { language },
      });
      if (error) {
        setAiError(typeof error === "object" ? error.error || "AI improvement failed." : String(error));
      } else {
        const text = data?.improved_content ?? data?.result?.improved_text ?? data?.improved_text ?? null;
        if (text) setAiSuggestion(text);
        else setAiError("No suggestion returned.");
      }
    } catch (err) {
      setAiError("AI improvement failed. Please try again.");
    } finally {
      setIsImproving(false);
    }
  };

  const handleChange = (val) => {
    setResumeData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === section.id ? { ...s, content: val } : s)),
    }));
  };

  const handleApplySuggestion = () => {
    if (aiSuggestion) {
      handleChange(aiSuggestion);
      setAiSuggestion(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div
          {...dragHandleProps}
          className="flex items-center gap-2 cursor-grab"
        >
          <GripVertical size={14} className="text-gray-300" />
          <FileText size={15} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-700">
            {section.title || t("resume.professionalSummary")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDeleteSection}
            className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
          >
            <X size={14} />
          </button>
          <button
            onClick={handleAIImprove}
            disabled={isImproving}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 hover:text-amber-600 transition-colors disabled:opacity-40"
          >
            {isImproving ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {t("form.aiImprove")}
          </button>
        </div>
      </div>

      <div className="p-6">
        <textarea
          className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 focus:bg-white transition-all text-sm text-gray-800 placeholder:text-gray-300 resize-none h-40 leading-relaxed"
          placeholder="Briefly describe your professional background and key achievements..."
          value={section.content || ""}
          onChange={(e) => handleChange(e.target.value)}
        />

        {aiSuggestion && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              {t("form.aiSuggestion") || "AI Suggestion"}
            </p>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-gray-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
              {aiSuggestion}
            </div>
            <button
              type="button"
              onClick={handleApplySuggestion}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-bold hover:bg-gray-700 transition-all"
            >
              <Check size={12} /> {t("form.applySuggestion") || "Apply suggestion"}
            </button>
          </div>
        )}

        {aiError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
            {aiError}
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryForm;
