import React from "react";
import { useNavigate } from "react-router-dom";
import { X, Check, Sparkles } from "lucide-react";

/**
 * UpgradeModal
 *
 * Shown when a free-tier user clicks any Pro-only feature.
 * Shows perks relevant to the specific feature they tried.
 *
 * Props:
 *   feature  — "AI Improve" | "ATS Score Checker" | "Job Tailoring"
 *   onClose  — () => void
 */

const FEATURE_DETAILS = {
  "AI Improve": {
    emoji: "✨",
    bg: "bg-amber-50",
    perks: [
      "Unlimited AI improvements on every section",
      "GPT-4 powered — strong verbs, quantified results",
      "You review every suggestion before it saves",
    ],
  },
  "ATS Score Checker": {
    emoji: "📊",
    bg: "bg-purple-50",
    perks: [
      "20 ATS checks per month",
      "Keyword gap analysis vs real job requirements",
      "Prioritised fixes with estimated score impact",
    ],
  },
  "Job Tailoring": {
    emoji: "🎯",
    bg: "bg-blue-50",
    perks: [
      "50 job tailorings per month",
      "Paste any job description, get a matched CV",
      "See which sections changed and exactly why",
    ],
  },
};

const FALLBACK = {
  emoji: "🔒",
  bg: "bg-gray-50",
  perks: [
    "Unlimited AI improvements",
    "ATS compatibility checker",
    "Job-specific CV tailoring",
  ],
};

const UpgradeModal = ({ feature, onClose }) => {
  const navigate = useNavigate();
  const d = FEATURE_DETAILS[feature] ?? FALLBACK;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent strip */}
        <div className={`h-1.5 w-full ${d.bg.replace("bg-", "bg-").replace("-50", "-400")}`} />

        <div className="p-8">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all"
          >
            <X size={15} />
          </button>

          {/* Emoji icon */}
          <div className={`w-14 h-14 ${d.bg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
            <span className="text-2xl">{d.emoji}</span>
          </div>

          {/* Heading */}
          <h3 className="text-xl font-black text-gray-900 text-center mb-2">
            Pro Feature
          </h3>
          <p className="text-sm text-gray-500 text-center leading-relaxed mb-7">
            <span className="font-semibold text-gray-800">{feature}</span> is
            available on the Pro plan.
          </p>

          {/* Perks */}
          <ul className="space-y-3 mb-8">
            {d.perks.map((perk, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                <div className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center">
                  <Check size={9} className="text-amber-600" />
                </div>
                {perk}
              </li>
            ))}
          </ul>

          {/* Buttons */}
          <button
            onClick={() => { onClose(); navigate("/pricing"); }}
            className="w-full py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-3"
          >
            <Sparkles size={14} className="text-amber-400" />
            View Pro Plans
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium"
          >
            Maybe later
          </button>

          <p className="text-center text-[11px] text-gray-300 mt-4">
            New accounts get a free 7-day Pro trial — no card needed
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;