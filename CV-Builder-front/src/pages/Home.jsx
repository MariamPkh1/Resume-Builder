import React, { useState, useEffect } from "react";
import heroResume from "../assets/hero-resume.png";
import NavBar from "../components/NavBar";
import FeaturesSection from "../components/FeatureSection";
import { useNavigate } from "react-router-dom";
import { ChevronRight, LayoutDashboard, CheckCircle2, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Footer from "../components/Footer";

// ── Typewriter hook ────────────────────────────────────────────────────────────
const ORIGINAL =
  "Experienced software developer with 5 years in web development. I have worked on many projects and have good communication skills.";
const IMPROVED =
  "Results-driven Software Engineer with 5+ years architecting scalable web applications, delivering 40% faster load times. Led cross-functional teams of 8+ engineers across 12 product launches.";

function useTypewriter(text, speed = 28, delay = 0) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    setDisplayed("");
    const t = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(interval);
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(t);
  }, [text, speed, delay]);
  return displayed;
}

// ── Animated counter ───────────────────────────────────────────────────────────
function useCounter(end, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return count;
}

// ── Resume card mock ───────────────────────────────────────────────────────────
function ResumeMock() {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "28px 24px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
        minWidth: 260,
        maxWidth: 320,
        fontFamily: "Georgia, serif",
        position: "relative",
      }}
    >
      {/* Header block */}
      <div style={{ borderBottom: "2px solid #1a1a1a", paddingBottom: 10, marginBottom: 12 }}>
        <div style={{ height: 10, width: "60%", background: "#1a1a1a", borderRadius: 3, marginBottom: 6 }} />
        <div style={{ height: 7, width: "40%", background: "#9ca3af", borderRadius: 3 }} />
      </div>
      {/* Section label */}
      <div style={{ height: 7, width: "30%", background: "#d1d5db", borderRadius: 3, marginBottom: 8 }} />
      {/* Lines */}
      {[90, 75, 85, 60, 80].map((w, i) => (
        <div
          key={i}
          style={{
            height: 6,
            width: `${w}%`,
            background: i === 0 ? "#374151" : "#e5e7eb",
            borderRadius: 3,
            marginBottom: 6,
          }}
        />
      ))}
      <div style={{ height: 1, background: "#f3f4f6", margin: "12px 0" }} />
      <div style={{ height: 7, width: "25%", background: "#d1d5db", borderRadius: 3, marginBottom: 8 }} />
      {[70, 55, 80].map((w, i) => (
        <div
          key={i}
          style={{
            height: 6,
            width: `${w}%`,
            background: "#e5e7eb",
            borderRadius: 3,
            marginBottom: 6,
          }}
        />
      ))}
      {/* Decorative corner accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 40,
          height: 40,
          background: "linear-gradient(135deg, transparent 50%, #3b82f6 50%)",
          borderRadius: "0 16px 0 0",
          opacity: 0.15,
        }}
      />
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [phase, setPhase] = useState("original"); // original | improving | improved
  const [heroVisible, setHeroVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

  const original = useTypewriter(ORIGINAL, 22, 700);
  const improved = useTypewriter(phase === "improved" ? IMPROVED : "", 18, 200);

  // Kick off phase transitions
  useEffect(() => {
    setHeroVisible(true);
    const t1 = setTimeout(() => setPhase("improving"), ORIGINAL.length * 22 + 1600);
    const t2 = setTimeout(() => setPhase("improved"), ORIGINAL.length * 22 + 2400);
    const t3 = setTimeout(() => setStatsVisible(true), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const resumeCount = useCounter(500, 1600, statsVisible);
  const atsRate = useCounter(94, 1600, statsVisible);
  const interviewsX = useCounter(3, 1200, statsVisible);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f9fb",
        fontFamily:
          "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Inject Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        :root {
          --blue-primary: #2563eb;
          --blue-light: #eff6ff;
          --blue-border: #bfdbfe;
          --blue-dark: #1d4ed8;
          --blue-gradient-from: #3b82f6;
          --blue-gradient-to: #6366f1;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .hero-fadeup {
          opacity: 0;
          animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) forwards;
        }
        .cursor::after {
          content: '|';
          animation: blink 1s step-end infinite;
          color: #3b82f6;
        }
        .stat-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .primary-btn:hover {
          background: #111827 !important;
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.18) !important;
        }
        .primary-btn:active { transform: translateY(0); }
        .ghost-btn:hover { background: #f3f4f6 !important; }
      `}</style>

      <NavBar />

      {/* ── Hero ── */}
      <section
        style={{
          position: "relative",
          padding: "100px 24px 80px",
          overflow: "hidden",
        }}
      >
        {/* Background radial glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 900,
            height: 500,
            background:
              "radial-gradient(ellipse at center top, rgba(59,130,246,0.10) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
          }}
        >
          {/* Left */}
          <div
            className="hero-fadeup"
            style={{ animationDelay: "0.05s", animationFillMode: "forwards" }}
          >
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 999,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1e40af",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 28,
              }}
            >
              <span style={{ position: "relative", display: "inline-flex" }}>
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "#3b82f6",
                    opacity: 0.4,
                    animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite",
                  }}
                />
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#3b82f6",
                    display: "inline-block",
                  }}
                />
              </span>
              {t("landing.badge") || "Powered by Advanced AI"}
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: "clamp(40px, 5vw, 62px)",
                fontWeight: 900,
                lineHeight: 1.06,
                letterSpacing: "-0.03em",
                color: "#0f172a",
                marginBottom: 20,
              }}
            >
              {t("landing.heroTitle") || "Create a"}{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t("landing.heroTitleHighlight") || "Stellar Resume"}
              </span>
              <br />
              {t("landing.heroTitleEnd") || "That Gets You Hired"}
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 17,
                color: "#64748b",
                lineHeight: 1.65,
                marginBottom: 36,
                maxWidth: 480,
              }}
            >
              {t("landing.heroSubtitle") ||
                "Build high-impact professional resumes in minutes using advanced AI. Beat ATS filters, impress recruiters, land more interviews."}
            </p>

            {/* CTA Buttons */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 44 }}>
              <button
                className="primary-btn"
                onClick={() => navigate(user ? "/app" : "/signup")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 28px",
                  background: "#0f172a",
                  color: "white",
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: 15,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.20)",
                  transition: "all 0.2s ease",
                }}
              >
                {user ? (
                  <>
                    {t("landing.goToDashboard") || "Go to Dashboard"}
                    <LayoutDashboard size={16} />
                  </>
                ) : (
                  <>
                    {t("landing.getStartedFree") || "Build My CV"}
                    <ChevronRight size={16} />
                  </>
                )}
              </button>

              <button
                className="ghost-btn"
                onClick={() => navigate("/templates")}
                style={{
                  padding: "14px 28px",
                  background: "white",
                  color: "#374151",
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: 15,
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {t("landing.browseTemplates") || "View Templates"}
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 32 }}>
              {[
                { value: `${resumeCount}+`, label: "Resumes built" },
                { value: `${atsRate}%`, label: "ATS pass rate" },
                { value: `${interviewsX}x`, label: "More interviews" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      lineHeight: 1,
                      marginBottom: 4,
                    }}
                  >
                    {value}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating resume + AI tooltip */}
          <div
            className="hero-fadeup"
            style={{
              animationDelay: "0.18s",
              animationFillMode: "forwards",
              position: "relative",
              display: "flex",
              justifyContent: "center",
            }}
          >
            {/* Floating resume mock */}
            {/* Floating resume image */}
<div style={{ animation: "float 3.5s ease-in-out infinite" }}>
  <img
    src={heroResume}
    alt="Resume preview"
    style={{
  width: 520,
  maxWidth: "100%",
  borderRadius: 16,
  boxShadow: "0 8px 40px rgba(0,0,0,0.13)",
  display: "block",
}}
  />
</div>

            {/* AI tooltip overlay */}
            <div
              style={{
                position: "absolute",
                bottom: -24,
                left: -16,
                width: 320,
                background: "white",
                borderRadius: 18,
                border: "1px solid #f1f5f9",
                boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
                padding: 18,
                animation: "fadeIn 0.5s ease 1s both",
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Sparkles size={13} color="white" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                  AI Summary Writer
                </span>
                {phase === "improving" && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#3b82f6",
                      animation: "blink 1s step-end infinite",
                    }}
                  >
                    Improving…
                  </span>
                )}
              </div>

              {/* Text area */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  lineHeight: 1.65,
                  color: "#334155",
                  minHeight: 70,
                }}
              >
                {phase === "improved" ? (
                  <span>
                    {improved}
                    {improved.length < IMPROVED.length && (
                      <span className="cursor" />
                    )}
                  </span>
                ) : (
                  <span>
                    {original}
                    {phase === "original" && original.length < ORIGINAL.length && (
                      <span className="cursor" />
                    )}
                  </span>
                )}
              </div>

              {/* Success message */}
              {phase === "improved" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#16a34a",
                    animation: "fadeIn 0.4s ease",
                  }}
                >
                  <CheckCircle2 size={14} />
                  87% more impactful — ATS score ↑ 34pts
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          height: 1,
          background: "linear-gradient(to right, transparent, #e2e8f0, transparent)",
        }}
      />

      {/* ── Features Section (unchanged) ── */}
      <FeaturesSection />
      <Footer />
    </div>
  );
};

export default Home;