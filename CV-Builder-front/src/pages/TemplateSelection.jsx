import React, { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import NavBar from "../components/NavBar";
import { showToast } from "../utils/toast";
import classicPreview from "../assets/preview-classic.png";
import modernPreview from "../assets/europass-preview.png";

const TEMPLATE_PREVIEWS = {
  classic: classicPreview,
  modern: modernPreview,
};

const templates = [
  {
    id: "classic",
    nameKey: "templates.classicName",
    introKey: "templates.classicIntro",
    featureKeys: ["templates.classicF1", "templates.classicF2", "templates.classicF3"],
    accentColor: "#0f172a",
    accentLight: "#e2e8f0",
    tagColor: "#f1f5f9",
    tagBorder: "#e2e8f0",
    tagText: "#475569",
    index: "01",
  },
  {
    id: "modern",
    nameKey: "templates.europassName",
    introKey: "templates.europassIntro",
    featureKeys: ["templates.europassF1", "templates.europassF2", "templates.europassF3"],
    accentColor: "#2563eb",
    accentLight: "#dbeafe",
    tagColor: "#eff6ff",
    tagBorder: "#bfdbfe",
    tagText: "#1d4ed8",
    index: "02",
  },
];

const buildDefaultCvData = (user) => {
  return {
    personal_info: {
      fullName: user?.full_name || user?.name || "",
      jobTitle: "",
      email: user?.email || "",
      phone: "",
      location: "",
      linkedin: "",
    },
  };
};

// ── Skeleton Mockup ───────────────────────────────────────────────────────────
const SkeletonMockup = ({ accentColor, accentLight, id }) => (
  <div style={{
    width: "100%", aspectRatio: "0.707", background: "white",
    borderRadius: 4, padding: "18px 16px",
    display: "flex", flexDirection: "column", gap: 9, boxSizing: "border-box",
  }}>
    {id === "modern" ? (
      <div style={{ display: "flex", gap: 10, height: "100%" }}>
        <div style={{ width: "34%", background: accentColor, borderRadius: 3, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.2)", margin: "0 auto 6px" }} />
          {[60, 80, 50, 70, 55].map((w, i) => (
            <div key={i} style={{ height: 3, width: `${w}%`, background: "rgba(255,255,255,0.2)", borderRadius: 2 }} />
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ height: 7, width: "75%", background: "#1e293b", borderRadius: 3 }} />
          <div style={{ height: 4, width: "45%", background: accentColor, borderRadius: 3, opacity: 0.6 }} />
          <div style={{ height: 1, background: "#f1f5f9", margin: "2px 0" }} />
          {[90, 75, 82, 60, 70, 55].map((w, i) => (
            <div key={i} style={{ height: 3, width: `${w}%`, background: "#e8edf2", borderRadius: 2 }} />
          ))}
        </div>
      </div>
    ) : (
      <>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, paddingBottom: 8, borderBottom: "1px solid #e8edf2" }}>
          <div style={{ height: 8, width: "55%", background: "#1e293b", borderRadius: 3 }} />
          <div style={{ height: 4, width: "35%", background: accentLight, borderRadius: 3 }} />
          <div style={{ display: "flex", gap: 8 }}>
            {[40, 30, 35].map((w, i) => <div key={i} style={{ height: 3, width: w, background: "#e2e8f0", borderRadius: 2 }} />)}
          </div>
        </div>
        <div style={{ height: 4, width: "28%", background: accentColor, borderRadius: 3, opacity: 0.35 }} />
        {[85, 70, 78, 62].map((w, i) => (
          <div key={i} style={{ height: 3, width: `${w}%`, background: "#e8edf2", borderRadius: 2 }} />
        ))}
        <div style={{ height: 4, width: "22%", background: accentColor, borderRadius: 3, opacity: 0.35, marginTop: 3 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {[38, 52, 30, 46].map((w, i) => (
            <div key={i} style={{ height: 7, width: w, background: accentLight, borderRadius: 20 }} />
          ))}
        </div>
      </>
    )}
  </div>
);

const TemplatePreview = ({ tmpl }) => {
  const src = TEMPLATE_PREVIEWS[tmpl.id];
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", background: "#ffffff" }}>
      {src ? (
        <img
          src={src}
          alt={`${tmpl.id} preview`}
          style={{ width: "100%", height: "100%", objectPosition: "top", display: "block" }}
        />
      ) : (
        <div style={{ padding: 18 }}>
          <SkeletonMockup accentColor={tmpl.accentColor} accentLight={tmpl.accentLight} id={tmpl.id} />
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const TemplateSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isCreating, setIsCreating] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const handleStart = async (templateId) => {
    if (!user) { navigate("/login", { state: { selectedTemplate: templateId } }); return; }
    setIsCreating(templateId);
    const cvData = buildDefaultCvData(user);
    const sectionOrder = cvData.sections?.map((s) => s.id) ?? [];
    try {
      const response = await api.post("/api/cvs/", {
        title: `My ${templateId.charAt(0).toUpperCase() + templateId.slice(1)} Resume`,
        template: templateId,
        language: user?.preferred_language || "en",
        section_order: sectionOrder,
        cv_data: cvData,
      });
      navigate(`/app/builder/${templateId}/${response.data.id}`);
    } catch (err) {
      if (err.response?.status === 403) {
        showToast({ message: err.response?.data?.detail || "You've reached the Free tier limit. Please upgrade to Pro!" });
        navigate("/pricing");
      } else {
        console.error("CV creation failed:", err.response?.data);
        showToast({ message: "Could not create resume. Please check your connection." });
      }
    } finally {
      setIsCreating(null);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fafafa",
      fontFamily: "'Geist', 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .ts-card {
          transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease;
          will-change: transform;
        }
        .ts-card:hover {
          transform: translateY(-4px);
        }
        .ts-preview-wrap {
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);
        }
        .ts-card:hover .ts-preview-wrap {
          transform: scale(1.025) translateY(-3px);
        }
        .ts-btn {
          transition: all 0.18s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .ts-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0);
          transition: background 0.15s ease;
        }
        .ts-btn:hover::after { background: rgba(255,255,255,0.08); }
        .ts-btn:active { transform: scale(0.98); }
        .ts-btn:disabled { cursor: not-allowed; opacity: 0.6; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-1 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-2 { animation: fadeUp 0.5s 0.06s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-3 { animation: fadeUp 0.5s 0.12s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-4 { animation: fadeUp 0.5s 0.18s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-5 { animation: fadeUp 0.5s 0.24s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent);
        }

        @media (max-width: 640px) {
          .cards-grid { grid-template-columns: 1fr !important; }

          /* Stack card: preview on top, content below */
          .ts-card { flex-direction: column !important; }

          .ts-preview-panel {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid #f0f2f5 !important;
          }

          .ts-preview-wrap {
            width: 100% !important;
            aspect-ratio: unset !important;
            height: 320px !important;
            overflow: hidden !important;
          }

          .ts-preview-wrap > div {
            height: 100% !important;
          }

          .ts-preview-wrap img {
            object-fit: cover !important;
            height: 100% !important;
            width: 100% !important;
          }
      `}</style>

      {/* Marketing NavBar (same as Home/Pricing) */}
      <NavBar />

      {/* ── Main — note: pt-24 to clear the fixed NavBar ── */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "96px 24px 80px", 
        maxWidth: 1180,
        margin: "0 auto",
        width: "100%",
      }}>

        {/* Header */}
        <div className="anim-1" style={{ textAlign: "center", marginBottom: 25, maxWidth: 500 }}>
          <h1 style={{
            fontSize: 36, fontWeight: 800, color: "#0f172a",
            letterSpacing: "-0.03em", lineHeight: 1.15, margin: "5px 1px 14px",
          }}>
            Resume Templates
          </h1>
        </div>

        <div className="divider-line anim-1" style={{ width: "100%", marginBottom: 32 }} />

        {/* Cards */}
        <div
          className="cards-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 22,
            width: "100%",
          }}
        >
          {templates.map((tmpl, idx) => {
            const loading = isCreating === tmpl.id;
            const isHovered = hoveredId === tmpl.id;

            return (
              <div
                key={tmpl.id}
                className={`ts-card anim-${idx + 2}`}
                onMouseEnter={() => setHoveredId(tmpl.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: "white",
                  borderRadius: 16,
                  border: `1px solid ${isHovered ? "#cbd5e1" : "#eef0f3"}`,
                  overflow: "hidden",
                  boxShadow: isHovered
                    ? "0 16px 40px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.04)"
                    : "0 1px 6px rgba(15,23,42,0.04)",
                  display: "flex",
                  flexDirection: "row",
                }}
              >
                {/* Preview area (left) */}
                <div
                  className="ts-preview-panel"
                  style={{
                    width: 240,
                    background: "#ffffff",
                    padding: 0,
                    display: "flex",
                    borderRight: "1px solid #f0f2f5",
                    transition: "background 0.3s ease",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <div className="ts-preview-wrap" style={{ width: "100%", aspectRatio: "0.707" }}>
                    <TemplatePreview tmpl={tmpl} />
                  </div>
                </div>

                {/* Card body (right) */}
                <div style={{ padding: "22px 22px 22px", flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

                  {/* Index + name row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: tmpl.tagText,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        background: tmpl.tagColor,
                        border: `1px solid ${tmpl.tagBorder}`,
                        padding: "3px 8px", borderRadius: 5,
                        display: "inline-block", alignSelf: "flex-start",
                      }}>
                        {tmpl.id === "classic" ? "Minimal" : "Structured"}
                      </span>
                      <span style={{
                        fontSize: 18, fontWeight: 800, color: "#0f172a",
                        letterSpacing: "-0.03em", lineHeight: 1.18,
                        wordBreak: "break-word",
                      }}>
                        {t(tmpl.nameKey)}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: "#e2e8f0",
                      letterSpacing: "0.05em", marginTop: 2, flexShrink: 0,
                    }}>
                      {tmpl.index}
                    </span>
                  </div>

                  {/* Description */}
                  <p style={{
                    fontSize: 13, color: "#64748b", lineHeight: 1.65,
                    marginBottom: 16, flex: 1, fontWeight: 450,
                    wordBreak: "break-word",
                  }}>
                    {t(tmpl.introKey)}
                  </p>

                  {/* CTA button */}
                  <button
                    className="ts-btn"
                    disabled={!!isCreating}
                    onClick={() => !isCreating && handleStart(tmpl.id)}
                    style={{
                      width: "100%",
                      padding: "11px 0",
                      background: loading ? "#94a3b8" : tmpl.accentColor,
                      color: "white",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontFamily: "inherit",
                      boxShadow: loading ? "none" : `0 4px 14px ${tmpl.accentColor}35`,
                    }}
                  >
                    {loading ? (
                      <><Loader2 size={13} className="spin" /> {t("templates.initializing")}</>
                    ) : (
                      <>{t("templates.selectDesign")} <ArrowRight size={13} strokeWidth={2.5} /></>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="anim-5" style={{ marginTop: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}>
            <Sparkles size={11} color="#f59e0b" />
            <span>{t("templates.interchangeable")}</span>
          </div>
        </div>

      </main>
    </div>
  );
};

export default TemplateSelection;