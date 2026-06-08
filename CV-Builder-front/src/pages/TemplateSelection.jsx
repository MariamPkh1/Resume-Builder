import React, { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, CheckCircle, Globe } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import NavBar from "../components/NavBar";
import { showToast } from "../utils/toast";
import classicPreview from "../assets/preview-classic.png";
import modernPreview from "../assets/europass-preview.png";

const buildDefaultCvData = (user) => ({
  personal_info: {
    fullName: user?.full_name || user?.name || "",
    jobTitle: "",
    email: user?.email || "",
    phone: "",
    location: "",
    linkedin: "",
  },
});

const TemplateSelection = () => {
  const navigate = useNavigate();
  const { user, refreshUser, canCreateResume } = useAuth();
  const { t } = useLanguage();
  const [isCreating, setIsCreating] = useState(null);

  const handleStart = async (templateId) => {
    if (!user) { navigate("/login", { state: { selectedTemplate: templateId } }); return; }
    if (!canCreateResume) {
      showToast({ message: "You've reached your resume limit. Upgrade to Pro for more!" });
      navigate("/pricing");
      return;
    }
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
      await refreshUser?.();
      navigate(`/app/builder/${templateId}/${response.data.id}`);
    } catch (err) {
      if (err.response?.status === 403) {
        showToast({ message: err.response?.data?.detail || "You've reached the Free tier limit. Please upgrade to Pro!" });
        navigate("/pricing");
      } else {
        showToast({ message: "Could not create resume. Please check your connection." });
      }
    } finally {
      setIsCreating(null);
    }
  };

  const templates = [
    {
      id: "classic",
      nameKey: "templates.classicName",
      introKey: "templates.classicIntro",
      badge: "ATS Optimized",
      BadgeIcon: CheckCircle,
      tag: "Minimal",
      index: "01",
      previewBg: "#f2f4f6",
      btnBg: "#0f172a",
      btnHoverBg: "#1e293b",
      btnColor: "#ffffff",
      btnShadow: "none",
      src: classicPreview,
    },
    {
      id: "modern",
      nameKey: "templates.europassName",
      introKey: "templates.europassIntro",
      badge: "Global Standard",
      BadgeIcon: Globe,
      tag: "Structured",
      index: "02",
      previewBg: "#0f172a",
      btnBg: "#3b82f6",
      btnHoverBg: "#2563eb",
      btnColor: "#ffffff",
      btnShadow: "0 4px 14px rgba(59,130,246,0.3)",
      src: modernPreview,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f7f9fb", fontFamily: "'Inter', -apple-system, sans-serif", color: "#191c1e" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-1 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-2 { animation: fadeUp 0.5s 0.09s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-3 { animation: fadeUp 0.5s 0.18s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-4 { animation: fadeUp 0.5s 0.27s cubic-bezier(0.22,1,0.36,1) both; }

        .ts-card {
          transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease;
        }
        .ts-card:hover {
          transform: translateY(-4px);
          box-shadow: 0px 12px 30px rgba(15,23,42,0.08) !important;
        }
        .ts-card:hover .ts-img {
          transform: scale(1.03);
        }
        .ts-img {
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);
        }

        .ts-btn {
          transition: opacity 0.15s, transform 0.15s;
          cursor: pointer;
        }
        .ts-btn:hover { opacity: 0.92; }
        .ts-btn:active { transform: scale(0.98); }
        .ts-btn:disabled { cursor: not-allowed; opacity: 0.55; }
      `}</style>

      <NavBar />

      {/* Subtle bg accent */}
      <div style={{ position: "fixed", top: 0, right: 0, zIndex: 0, width: "33%", height: "100vh", opacity: 0.04, pointerEvents: "none", background: "linear-gradient(to left, #0f172a, transparent)" }} />

      <main style={{ position: "relative", zIndex: 1, paddingTop: 90, paddingBottom: 64, paddingLeft: 56, paddingRight: 56 }}>

        {/* Hero */}
        <section className="anim-1" style={{ textAlign: "center", marginBottom: 44, maxWidth: 1440, margin: "0 auto 44px" }}>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 40, fontWeight: 700, color: "#0f172a",
            letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 14px",
          }}>
            Resume Templates
          </h1>
          <p style={{ fontSize: 15, fontWeight: 400, color: "#545f73", lineHeight: 1.6, maxWidth: 500, margin: "0 auto", opacity: 0.85 }}>
            Professional, ATS-friendly layouts designed to accelerate your career.
            Experience executive precision in every pixel.
          </p>
        </section>

        {/* Cards */}
        <div
          className="anim-2"
          style={{
            maxWidth: 1100, margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          {templates.map((tmpl, idx) => {
            const loading = isCreating === tmpl.id;
            const { BadgeIcon } = tmpl;
            return (
              <div
                key={tmpl.id}
                className={`ts-card anim-${idx + 2}`}
                style={{
                  background: "#ffffff",
                  borderRadius: 2,
                  border: "1px solid rgba(198,198,205,0.3)",
                  boxShadow: "0px 4px 20px rgba(15,23,42,0.05)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "row",
                }}
              >
                {/* Left: preview panel */}
                <div style={{
                  width: "42%",
                  flexShrink: 0,
                  background: tmpl.previewBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "26px 20px",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  {/* Badge */}
                  <div style={{
                    position: "absolute", top: 12, left: 12, zIndex: 2,
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 2,
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(198,198,205,0.25)",
                    backdropFilter: "blur(8px)",
                  }}>
                    <BadgeIcon size={12} color="#0f172a" strokeWidth={2.5} />
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0f172a" }}>
                      {tmpl.badge}
                    </span>
                  </div>

                  {/* Actual resume preview image */}
                  <div style={{
                    width: "100%",
                    borderRadius: 0,
                    overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#fff",
                    aspectRatio: "3/4",
                  }}>
                    <img
                      className="ts-img"
                      src={tmpl.src}
                      alt={tmpl.id}
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
                    />
                  </div>
                </div>

                {/* Right: info panel */}
                <div style={{ flex: 1, padding: "24px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
                  <div>
                    {/* Tag + index */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                        color: "#0f172a", background: "#e6e8ea",
                        padding: "3px 10px", borderRadius: 2,
                      }}>
                        {tmpl.tag}
                      </span>
                      <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(198,198,205,0.7)", letterSpacing: "-0.02em" }}>
                        {tmpl.index}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 20, fontWeight: 600, color: "#0f172a",
                      lineHeight: 1.4, margin: "0 0 10px",
                    }}>
                      {t(tmpl.nameKey)}
                    </h3>

                    {/* Description */}
                    <p style={{ fontSize: 13, color: "#545f73", lineHeight: 1.65, fontWeight: 400, margin: "0 0 24px" }}>
                      {t(tmpl.introKey)}
                    </p>
                  </div>

                  {/* Button */}
                  <button
                    className="ts-btn"
                    disabled={!!isCreating}
                    onClick={() => !isCreating && handleStart(tmpl.id)}
                    style={{
                      width: "100%", padding: "12px 0",
                      background: tmpl.btnBg, color: tmpl.btnColor,
                      border: "none", borderRadius: 2,
                      fontSize: 13, fontWeight: 600, letterSpacing: "0.04em",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      fontFamily: "'Inter', sans-serif",
                      boxShadow: tmpl.btnShadow,
                    }}
                  >
                    {loading ? (
                      <><Loader2 size={14} className="spin" /> {t("templates.initializing")}</>
                    ) : (
                      <>{t("templates.selectDesign")} <ArrowRight size={14} strokeWidth={2.5} /></>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interchangeable note */}
        <div className="anim-4" style={{ maxWidth: 1440, margin: "32px auto 0", display: "flex", justifyContent: "center" }}>
          <div style={{
            padding: "14px 24px", borderRadius: 2,
            background: "#ffffff",
            border: "1px solid rgba(198,198,205,0.2)",
            boxShadow: "0 4px 20px rgba(15,23,42,0.05)",
            maxWidth: 680, width: "100%", textAlign: "center",
          }}>
            <p style={{ fontSize: 13, color: "#545f73", fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>
              {t("templates.interchangeable")}
            </p>
          </div>
        </div>

      </main>
    </div>
  );
};

export default TemplateSelection;
