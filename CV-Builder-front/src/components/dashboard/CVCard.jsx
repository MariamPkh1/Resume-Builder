import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy, Trash2, Archive, ArchiveRestore, Tag, AlertTriangle,
  MoreVertical, ArrowRight,
} from "lucide-react";
import LabelPill from "./LabelPill";
import LabelPopover from "./LabelPopover";
import LivePreview from "../classic-template/LivePreview";
import EuropassPreview from "../europass-template/EuropassPreview";

const T = {
  surface: "#ffffff",
  surfaceLow: "#f2f4f6",
  surfaceContainer: "#eceef0",
  primary: "#000000",
  onPrimary: "#ffffff",
  onSurface: "#191c1e",
  onSurfaceVariant: "#45464d",
  outline: "#76777d",
  outlineVariant: "rgba(198,198,205,0.25)",
  secondary: "#545f73",
  error: "#ba1a1a",
  gold: "#B48C4F",
  fontBody: "'Inter', -apple-system, sans-serif",
  fontHeadline: "'Playfair Display', Georgia, serif",
};

const getCvData = (resume) => {
  if (resume.cv_data && (resume.cv_data.personal_info || resume.cv_data.personalInfo || (resume.cv_data.sections && resume.cv_data.sections.length > 0))) {
    return resume.cv_data;
  }
  const raw = resume.personalInfo || resume.personal_info || {};
  const personalInfo = { ...raw, fullName: raw.fullName || raw.full_name };
  const sections = resume.sections || [];
  if (personalInfo.fullName || sections.length > 0) return { personalInfo, personal_info: personalInfo, sections };
  return {};
};

// ── Resume Thumbnail ──────────────────────────────────────────────────────────
const ResumeThumb = ({ resume }) => {
  const isEuropass = resume.template === "europass" || resume.template === "modern";
  const cvData = getCvData(resume);
  const PREVIEW_WIDTH = 794;
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.35);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / PREVIEW_WIDTH);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Full A4 page height
  const containerHeight = PREVIEW_WIDTH * scale * 1.414;

  return (
    <div ref={containerRef} style={{ width: "100%", overflow: "hidden", background: "#fff", height: `${containerHeight}px`, position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: `${PREVIEW_WIDTH}px`, transformOrigin: "top left", transform: `scale(${scale})`, pointerEvents: "none", userSelect: "none" }}>
        {isEuropass ? <EuropassPreview data={cvData} /> : <div style={{ width: 794 }}><LivePreview data={cvData} /></div>}
      </div>
    </div>
  );
};

// ── CVCard ─────────────────────────────────────────────────────────────────────
const CVCard = ({ resume, tab, isPro, labels, onDelete, onDuplicate, onArchive, onUnarchive, onLabelUpdate, t }) => {
  const navigate = useNavigate();
  const [labelPopoverOpen, setLabelPopoverOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const labelAnchorRef = useRef(null);
  const menuRef = useRef(null);

  const openEditor = () => navigate(`/app/builder/${resume.template}/${resume.id}`);

  const cvData = getCvData(resume);
  const hasPreviewData = !!(
    cvData.personal_info?.fullName || cvData.personal_info?.full_name ||
    cvData.personalInfo?.fullName || cvData.personalInfo?.full_name ||
    (cvData.sections && cvData.sections.length > 0)
  );

  const isEuropass = resume.template === "europass" || resume.template === "modern";
  const previewBg = isEuropass ? "#1e293b" : T.surfaceLow;

  return (
    <>
      {/* DELETE MODAL */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(25,28,30,0.45)", backdropFilter: "blur(6px)" }} onClick={() => setShowDeleteConfirm(false)} />
          <div style={{ position: "relative", background: T.surface, borderRadius: 16, boxShadow: "0 32px 80px rgba(0,0,0,0.12)", width: "100%", maxWidth: 360, border: `1px solid ${T.outlineVariant}`, overflow: "hidden", fontFamily: T.fontBody }}>
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ margin: "0 auto 20px", width: 52, height: 52, background: "#fff0f0", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle color={T.error} size={24} />
              </div>
              <h3 style={{ fontFamily: T.fontHeadline, fontSize: 20, fontWeight: 700, color: T.onSurface, marginBottom: 8 }}>{t("dashboard.deleteResumeTitle")}</h3>
              <p style={{ fontSize: 13, color: T.secondary, lineHeight: 1.6, marginBottom: 28 }}>
                {t("dashboard.deleteResumeConfirm")}{" "}
                <strong style={{ color: T.onSurface }}>"{resume.title || t("dashboard.untitledResume")}"</strong>?{" "}
                {t("dashboard.deleteResumePermanent")}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: `1px solid ${T.outlineVariant}`, fontSize: 13, fontWeight: 600, color: T.onSurfaceVariant, background: T.surface, cursor: "pointer", fontFamily: T.fontBody }}>
                  {t("common.cancel")}
                </button>
                <button onClick={() => { onDelete(resume.id); setShowDeleteConfirm(false); }} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, color: "#fff", background: T.error, cursor: "pointer", fontFamily: T.fontBody }}>
                  {t("dashboard.delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CARD */}
      <div
        style={{
          background: T.surface,
          borderRadius: 10,
          border: `1px solid ${T.outlineVariant}`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0px 20px 40px -10px rgba(0,0,0,0.04)",
          transition: "box-shadow 0.3s ease, transform 0.3s ease",
          fontFamily: T.fontBody,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0px 30px 60px -12px rgba(0,0,0,0.08)";
          e.currentTarget.style.transform = "translateY(-4px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0px 20px 40px -10px rgba(0,0,0,0.04)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {/* PREVIEW AREA */}
        <div
          onClick={() => tab === "active" && openEditor()}
          style={{ position: "relative", background: previewBg, cursor: tab === "active" ? "pointer" : "default", overflow: "hidden" }}
        >
          <div style={{ transition: "transform 0.4s ease", transformOrigin: "top" }}
            onMouseEnter={(e) => { if (tab === "active") e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {hasPreviewData ? (
              <ResumeThumb resume={resume} />
            ) : (
              <div style={{ aspectRatio: "1/1.414", display: "flex", flexDirection: "column", justifyContent: "flex-start", background: previewBg, padding: "20px 18px" }}>
                {/* Skeleton header */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 24, height: 24, background: isEuropass ? "rgba(255,255,255,0.25)" : T.onSurface, borderRadius: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ height: 5, background: isEuropass ? "rgba(255,255,255,0.3)" : T.outlineVariant, borderRadius: 9999, width: "55%" }} />
                    <div style={{ height: 3.5, background: isEuropass ? "rgba(255,255,255,0.15)" : "rgba(198,198,205,0.4)", borderRadius: 9999, width: "75%" }} />
                  </div>
                </div>
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{ height: 3, background: isEuropass ? "rgba(255,255,255,0.1)" : "rgba(198,198,205,0.3)", borderRadius: 9999, marginBottom: 7, width: `${55 + Math.sin(i * 1.5) * 35}%` }} />
                ))}
              </div>
            )}
          </div>

          {/* Hover overlay — "Open Editor" pill */}
          {tab === "active" && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(255,255,255,0.45)", backdropFilter: "blur(2px)",
              opacity: 0, transition: "opacity 0.25s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
            >
              <div style={{ background: T.surface, border: `1px solid ${T.outlineVariant}`, borderRadius: 9999, padding: "8px 20px", fontSize: 10, fontWeight: 700, color: T.onSurface, textTransform: "uppercase", letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
                Open Editor <ArrowRight size={11} color={T.primary} />
              </div>
            </div>
          )}
        </div>

        {/* CARD FOOTER */}
        <div style={{ padding: "11px 12px 12px", borderTop: `1px solid ${T.outlineVariant}` }}>

          {/* Title */}
          <h3 style={{ fontSize: 13, fontWeight: 700, color: T.onSurface, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: T.fontBody }}>
            {resume.title || "Untitled Resume"}
          </h3>

          {/* Date */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.outline} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{ fontSize: 10, color: T.outline, fontFamily: T.fontBody }}>
              Updated {new Date(resume.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {/* Labels row (if any) */}
          {resume.labels?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
              {resume.labels.map((label) => <LabelPill key={label.id} label={label} />)}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: T.outlineVariant, margin: "8px 0" }} />

          {/* Actions row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
              {tab === "active" ? (
                <>
                  {/* Duplicate */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicate(resume); }}
                    title={isPro ? "Duplicate" : "Upgrade to Duplicate"}
                    style={{ padding: "5px 6px", background: "none", border: "none", borderRadius: 6, cursor: isPro ? "pointer" : "not-allowed", color: T.outline, opacity: isPro ? 1 : 0.3, display: "flex", transition: "background 0.15s, color 0.15s" }}
                    onMouseEnter={(e) => { if (isPro) { e.currentTarget.style.color = T.onSurface; e.currentTarget.style.background = T.surfaceContainer; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = T.outline; e.currentTarget.style.background = "none"; }}
                  >
                    <Copy size={13} />
                  </button>

                  {/* Archive */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onArchive(resume); }}
                    title="Archive"
                    style={{ padding: "5px 6px", background: "none", border: "none", borderRadius: 6, cursor: "pointer", color: T.outline, display: "flex", transition: "background 0.15s, color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = T.gold; e.currentTarget.style.background = "rgba(180,140,79,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = T.outline; e.currentTarget.style.background = "none"; }}
                  >
                    <Archive size={14} />
                  </button>

                  {/* Label */}
                  <div ref={labelAnchorRef} style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLabelPopoverOpen((v) => !v); }}
                      title="Labels"
                      style={{ padding: "5px 6px", background: "none", border: "none", borderRadius: 6, cursor: "pointer", color: labelPopoverOpen ? T.primary : T.outline, display: "flex", transition: "background 0.15s, color 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.onSurface; e.currentTarget.style.background = T.surfaceContainer; }}
                      onMouseLeave={(e) => { if (!labelPopoverOpen) { e.currentTarget.style.color = T.outline; e.currentTarget.style.background = "none"; } }}
                    >
                      <Tag size={14} />
                    </button>
                    {labelPopoverOpen && (
                      <LabelPopover cvId={resume.id} cvLabels={resume.labels || []} allLabels={labels} anchorRef={labelAnchorRef} onUpdate={onLabelUpdate} onClose={() => setLabelPopoverOpen(false)} />
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                    title="Delete"
                    style={{ padding: "5px 6px", background: "none", border: "none", borderRadius: 6, cursor: "pointer", color: T.outline, display: "flex", transition: "background 0.15s, color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = T.error; e.currentTarget.style.background = "rgba(186,26,26,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = T.outline; e.currentTarget.style.background = "none"; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onUnarchive(resume); }} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: "#92400e", background: "none", border: "none", cursor: "pointer", padding: "5px 6px", borderRadius: 6, transition: "background 0.15s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(146,64,14,0.07)"} onMouseLeave={(e) => e.currentTarget.style.background = "none"}>
                    <ArchiveRestore size={13} /> Restore
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} style={{ padding: "5px 6px", background: "none", border: "none", borderRadius: 6, cursor: "pointer", color: T.outline, display: "flex", transition: "background 0.15s, color 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.color = T.error; e.currentTarget.style.background = "rgba(186,26,26,0.06)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = T.outline; e.currentTarget.style.background = "none"; }}>
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>

            {/* More / Edit */}
            {tab === "active" && (
              <div ref={menuRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                  style={{ padding: "5px 6px", background: "none", border: "none", borderRadius: 6, cursor: "pointer", color: T.outline, display: "flex", transition: "background 0.15s, color 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = T.onSurface; e.currentTarget.style.background = T.surfaceContainer; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = T.outline; e.currentTarget.style.background = "none"; }}
                >
                  <MoreVertical size={14} />
                </button>
                {menuOpen && (
                  <div
                    style={{ position: "absolute", right: 0, bottom: "calc(100% + 6px)", background: T.surface, border: `1px solid ${T.outlineVariant}`, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", zIndex: 20, minWidth: 140, overflow: "hidden", fontFamily: T.fontBody }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button onClick={() => { setMenuOpen(false); openEditor(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 13px", background: "none", border: "none", fontSize: 12, fontWeight: 600, color: T.onSurface, cursor: "pointer", textAlign: "left" }}>
                      <ArrowRight size={12} /> Open Editor
                    </button>
                    <div style={{ height: 1, background: T.surfaceLow }} />
                    <button onClick={() => { setMenuOpen(false); onDuplicate(resume); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 13px", background: "none", border: "none", fontSize: 12, fontWeight: 500, color: isPro ? T.onSurface : T.outline, cursor: isPro ? "pointer" : "not-allowed", opacity: isPro ? 1 : 0.4, textAlign: "left" }}>
                      <Copy size={12} /> Duplicate
                    </button>
                    <button onClick={() => { setMenuOpen(false); onArchive(resume); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 13px", background: "none", border: "none", fontSize: 12, fontWeight: 500, color: T.onSurface, cursor: "pointer", textAlign: "left" }}>
                      <Archive size={12} /> Archive
                    </button>
                    <div style={{ height: 1, background: T.surfaceLow }} />
                    <button onClick={() => { setMenuOpen(false); setShowDeleteConfirm(true); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 13px", background: "none", border: "none", fontSize: 12, fontWeight: 500, color: T.error, cursor: "pointer", textAlign: "left" }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CVCard;
