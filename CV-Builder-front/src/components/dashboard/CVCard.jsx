import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FileEdit, Copy, Clock, Trash2, Archive, ArchiveRestore, Tag, AlertTriangle } from "lucide-react";
import LabelPill from "./LabelPill";
import LabelPopover from "./LabelPopover";
import LivePreview from "../classic-template/LivePreview";
import EuropassPreview from "../europass-template/EuropassPreview";

// Normalize resume data: API may return cv_data nested or flat personalInfo/sections
const getCvData = (resume) => {
  if (resume.cv_data && (resume.cv_data.personal_info || resume.cv_data.personalInfo || (resume.cv_data.sections && resume.cv_data.sections.length > 0))) {
    return resume.cv_data;
  }
  // Flat shape (e.g. from mock/legacy API)
  const raw = resume.personalInfo || resume.personal_info || {};
  const personalInfo = {
    ...raw,
    fullName: raw.fullName || raw.full_name,
  };
  const sections = resume.sections || [];
  if (personalInfo.fullName || sections.length > 0) {
    return { personalInfo, personal_info: personalInfo, sections };
  }
  return {};
};

// ── Mini Resume Preview Thumbnail ──────────────────────────────────────────
// Renders the actual resume template at a tiny scale inside the card.
// The outer container is sized to match an A4 aspect ratio (3:4.24),
// and the inner resume (210mm wide) is scaled down to fit.
const ResumeThumb = ({ resume }) => {
  const isEuropass = resume.template === "europass" || resume.template === "modern";
  const cvData = getCvData(resume);

  // The resume preview is designed for 210mm (~794px) wide.
  // We want to display it in a container that's roughly 280px wide (the card).
  // Scale factor: 280 / 794 ≈ 0.352
  const PREVIEW_WIDTH = 794;
  const SCALE = 0.352;

  return (
    <div
      className="w-full overflow-hidden rounded-sm bg-white"
      style={{
        // A4 aspect ratio at scaled size
        height: `${PREVIEW_WIDTH * SCALE * 1.414}px`,
        position: "relative",
      }}
    >
      {/* Prevent any clicks/hovers from interfering */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${PREVIEW_WIDTH}px`,
          transformOrigin: "top left",
          transform: `scale(${SCALE})`,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {isEuropass ? (
          <EuropassPreview data={cvData} />
        ) : (
          // LivePreview wraps content in a centered flex container with extra padding.
          // We pass zoom=1 and strip the outer wrapper by targeting only the inner div.
          <LivePreviewRaw data={cvData} />
        )}
      </div>
    </div>
  );
};

// LivePreview has a centering wrapper + padding we don't want in the thumb.
// This strips it to just render the A4 page directly.
const LivePreviewRaw = ({ data }) => {
  if (!data) return null;
  // Reuse LivePreview but override its outer wrapper styles via a clipping parent
  return (
    <div style={{ width: 794 }}>
      <LivePreview data={data} />
    </div>
  );
};

// ── Main CVCard ─────────────────────────────────────────────────────────────
const CVCard = ({
  resume,
  tab,
  isPro,
  labels,
  onDelete,
  onDuplicate,
  onArchive,
  onUnarchive,
  onLabelUpdate,
  t,
}) => {
  const navigate = useNavigate();
  const [labelPopoverOpen, setLabelPopoverOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const labelAnchorRef = useRef(null);

  const openEditor = () => navigate(`/app/builder/${resume.template}/${resume.id}`);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(resume.id);
    setShowDeleteConfirm(false);
  };

  // Decide whether we have enough data to show a real preview
  const cvData = getCvData(resume);
  const hasPreviewData = !!(
    cvData.personal_info?.fullName ||
    cvData.personal_info?.full_name ||
    cvData.personalInfo?.fullName ||
    cvData.personalInfo?.full_name ||
    (cvData.sections && cvData.sections.length > 0)
  );

  return (
    <>
      {/* ── DELETE MODAL ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">
            <div className="p-8 text-center">
              <div className="mx-auto w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-5 rotate-3">
                <AlertTriangle className="text-red-500" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{t("dashboard.deleteResumeTitle")}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">
                {t("dashboard.deleteResumeConfirm")}{" "}
                <span className="font-semibold text-slate-700">"{resume.title || t("dashboard.untitledResume")}"</span>?
                {" "}{t("dashboard.deleteResumePermanent")}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 rounded-2xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  {t("dashboard.delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CARD ── */}
      <div className="group relative flex flex-col bg-white rounded-2xl transition-all duration-500 border border-slate-100 hover:border-blue-200 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)]">

        {/* ── PREVIEW AREA ── */}
        <div className="overflow-hidden rounded-t-2xl">
          <div
            onClick={() => tab === "active" && openEditor()}
            className={`relative bg-[#F3F4F6] ${tab === "active" ? "cursor-pointer" : "cursor-default"}`}
          >
            {/* Archived badge */}
            {tab === "archived" && (
              <div className="absolute top-3 left-3 z-10 bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
                Archived
              </div>
            )}

            {/* ATS score badge */}
            {resume.ats_score && (
              <div className="absolute top-3 right-3 z-10 bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[9px] font-bold border border-emerald-100">
                ATS: {resume.ats_score}
              </div>
            )}

            {/* Actual resume preview or skeleton placeholder */}
            <div className="transition-transform duration-500 group-hover:scale-[1.02] origin-top">
              {hasPreviewData ? (
                <ResumeThumb resume={resume} />
              ) : (
                // Fallback skeleton if no data yet
                <div className="aspect-[3/4.24] flex items-center justify-center bg-[#FBFCFD]">
                  <div className="w-full h-full p-6">
                    <div className="h-1 w-16 bg-blue-100 rounded-full mb-4 mx-auto" />
                    <div className="space-y-2">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="h-0.5 bg-slate-100 rounded-full"
                          style={{ width: `${60 + Math.sin(i) * 30}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hover overlay */}
            {tab === "active" && (
              <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                <div className="bg-white border border-slate-100 text-slate-900 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-md">
                  <FileEdit size={12} className="text-blue-500" />
                  {t("dashboard.openEditor")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CARD FOOTER ── */}
        <div className="p-5 border-t border-slate-50">
          <div className="mb-3">
            <h3 className="text-xs font-bold text-slate-800 truncate tracking-wide mb-1">
              {resume.title || t("dashboard.untitledResume")}
            </h3>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[9px] font-medium text-slate-400 uppercase tracking-tighter">
                <Clock size={10} /> {new Date(resume.updated_at).toLocaleDateString()}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-300">
                {resume.template}
              </span>
            </div>
          </div>

          {resume.labels?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {resume.labels.map((label) => (
                <LabelPill key={label.id} label={label} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
            <div className="flex gap-3 items-center">
              {tab === "active" ? (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicate(resume); }}
                    className={`text-slate-400 hover:text-blue-500 transition-colors ${!isPro && "opacity-20 cursor-not-allowed"}`}
                    title={isPro ? "Duplicate" : "Upgrade to Duplicate"}
                  >
                    <Copy size={14} />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); onArchive(resume); }}
                    className="text-slate-400 hover:text-amber-500 transition-colors"
                    title="Archive"
                  >
                    <Archive size={14} />
                  </button>

                  <div ref={labelAnchorRef} className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLabelPopoverOpen((v) => !v); }}
                      className={`p-1.5 -m-1.5 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center ${
                        labelPopoverOpen
                          ? "text-purple-600 bg-purple-50"
                          : "text-slate-400 hover:text-purple-500 hover:bg-purple-50/50"
                      }`}
                      title="Manage labels"
                    >
                      <Tag size={14} />
                    </button>
                    {labelPopoverOpen && (
                      <LabelPopover
                        cvId={resume.id}
                        cvLabels={resume.labels || []}
                        allLabels={labels}
                        anchorRef={labelAnchorRef}
                        onUpdate={onLabelUpdate}
                        onClose={() => setLabelPopoverOpen(false)}
                      />
                    )}
                  </div>

                  <button
                    onClick={handleDeleteClick}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onUnarchive(resume); }}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors"
                  >
                    <ArchiveRestore size={14} /> Restore
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                    title="Delete permanently"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>

            {tab === "active" && (
              <button
                onClick={openEditor}
                className="text-blue-500 font-bold text-[10px] uppercase tracking-widest hover:text-blue-700 transition-colors"
              >
                Edit →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CVCard;