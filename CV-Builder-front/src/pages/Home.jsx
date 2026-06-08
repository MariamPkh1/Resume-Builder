import React, { useState, useEffect } from "react";
import heroResume from "../assets/landing.png";
import NavBar from "../components/NavBar";
import { useNavigate } from "react-router-dom";
import { Shield, Download, CopyPlus, Zap, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Footer from "../components/Footer";

const RAW = "Managed the software engineering team for the main platform product.";
const AI_RESULT =
  "Spearheaded a 40-person cross-functional engineering organization, reducing deployment latency by 35% through architectural modernization.";

function useTypewriter(text, speed = 26, delay = 0) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    setDisplayed("");
    const t = setTimeout(() => {
      const iv = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(iv);
      }, speed);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [text, speed, delay]);
  return displayed;
}

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [phase, setPhase] = useState("original");

  const rawText = useTypewriter(RAW, 22, 700);
  const aiText = useTypewriter(phase === "improved" ? AI_RESULT : "", 18, 200);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("improving"), RAW.length * 22 + 1600);
    const t2 = setTimeout(() => setPhase("improved"), RAW.length * 22 + 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // All base sizes scaled up ~10% from original design
  const C = 1210; // container max-width

  return (
    <div style={{ minHeight: "100vh", background: "#fcfcfd", fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,400;0,600;0,700;0,800;1,400;1,700&family=Inter:wght@300;400;500;600&display=swap');

        .glass-panel {
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.35);
          box-shadow: 0 8px 32px rgba(31,38,135,0.04);
        }
        @keyframes float {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(0.4deg); }
        }
        .anim-float  { animation: float 6s ease-in-out infinite; }
        .anim-float-2{ animation: float 6s ease-in-out -2s infinite; }
        .anim-float-4{ animation: float 6s ease-in-out -4s infinite; }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0; }
        }
        .cursor::after { content:'|'; animation: blink 1s step-end infinite; color:#2170e4; }
        @keyframes bounce-sm {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-5px); }
        }
        .anim-bounce { animation: bounce-sm 1.2s ease-in-out infinite; }

        .home-hero-grid { display:grid; grid-template-columns:7fr 5fr; gap:62px; align-items:center; }
        .home-feat-grid { display:grid; grid-template-columns:5fr 7fr; gap:80px; align-items:stretch; }
        .home-card-grid { display:grid; grid-template-columns:1fr 1fr; gap:22px; }

        @media (max-width:960px) {
          .home-hero-grid { grid-template-columns:1fr !important; }
          .home-feat-grid { grid-template-columns:1fr !important; }
          .home-card-grid { grid-template-columns:1fr !important; }
          .hero-right-col { display:none !important; }
          .feat-sticky    { position:static !important; }
        }

        .primary-btn:hover { background:#000 !important; transform:translateY(-1px); }
        .primary-btn:active { transform:scale(0.98); }
        .ghost-btn:hover { background:#f3f4f6 !important; }
        .feat-card:hover     { border-color:#2170e4 !important; transition:border-color 0.4s ease; }
        .feat-card-alt:hover { border-color:#e2e2e9 !important; transition:border-color 0.3s ease; }
      `}</style>

      <NavBar />

      {/* hero glow */}
      <div style={{
        position:"fixed", top:-220, right:-220, width:760, height:760, zIndex:0, pointerEvents:"none",
        background:"radial-gradient(circle, rgba(33,112,228,0.07) 0%, rgba(252,252,253,0) 70%)",
      }} />

      {/* ── Hero ── */}
      <section style={{ position:"relative", padding:"143px 30px 80px", zIndex:1 }}>
        <div className="home-hero-grid" style={{ maxWidth:C, margin:"0 auto" }}>

          {/* Left */}
          <div>
            {/* Badge */}
            <div style={{
              display:"inline-flex", alignItems:"center", gap:10, padding:"7px 18px",
              borderRadius:999, background:"white", border:"1px solid #e2e2e9",
              boxShadow:"0 1px 4px rgba(0,0,0,0.04)", marginBottom:30,
            }}>
              <span style={{
                width:24, height:24, borderRadius:"50%", background:"#2170e4",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>
                <span style={{ color:"white", fontSize:12, lineHeight:1 }}>✦</span>
              </span>
              <span style={{ fontSize:13, fontWeight:600, letterSpacing:"0.01em", color:"#0a0a0b" }}>
                {t("landing.badge")}
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily:"Hanken Grotesk, sans-serif",
              fontSize:"clamp(42px, 5.6vw, 66px)",
              fontWeight:800, lineHeight:1.08,
              letterSpacing:"-0.035em",
              color:"#0a0a0b", marginBottom:22, marginTop:0,
            }}>
              {t("landing.heroTitle")}<br />
              <span style={{
                background:"linear-gradient(135deg, #0a0a0b 0%, #4d4d54 100%)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                fontStyle:"italic",
              }}>
                {t("landing.heroTitleHighlight")}
              </span>
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize:18, color:"#4d4d54", lineHeight:1.65,
              marginBottom:40, maxWidth:505, fontWeight:400,
            }}>
              {t("landing.heroSubtitle")}
            </p>

            {/* CTA buttons */}
            <div style={{ display:"flex", gap:15, flexWrap:"wrap", marginTop:8 }}>
              <button
                className="primary-btn"
                onClick={() => navigate(user ? "/app" : "/signup")}
                style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"14px 31px", background:"#0a0a0b", color:"white",
                  borderRadius:18, fontWeight:700, fontSize:15,
                  border:"none", cursor:"pointer",
                  boxShadow:"0 8px 24px rgba(10,10,11,0.18)",
                  transition:"all 0.2s ease", fontFamily:"Inter, sans-serif",
                }}
              >
                {user ? t("landing.goToDashboard") : t("landing.getStartedFree")}
                <ArrowRight size={16} />
              </button>

              <button
                className="ghost-btn"
                onClick={() => navigate("/templates")}
                style={{
                  padding:"14px 31px", background:"white", color:"#374151",
                  borderRadius:18, fontWeight:700, fontSize:15,
                  border:"1px solid #e2e2e9", cursor:"pointer",
                  transition:"all 0.2s ease", fontFamily:"Inter, sans-serif",
                }}
              >
                {t("landing.browseTemplates")}
              </button>
            </div>
          </div>

          {/* Right — floating resume */}
          <div className="hero-right-col" style={{ position:"relative", display:"flex", justifyContent:"flex-start", paddingLeft:16 }}>
            <div className="anim-float glass-panel" style={{ borderRadius:18, padding:4, boxShadow:"0 32px 90px -18px rgba(0,0,0,0.13)" }}>
              <img
                src={heroResume}
                alt="Resume preview"
                style={{ width:"100%", maxWidth:370, borderRadius:14, display:"block" }}
              />
            </div>

            {/* ATS chip */}
            <div className="anim-float-2 glass-panel" style={{
              position:"absolute", top:-32, left:-8, zIndex:20,
              padding:"16px 18px", borderRadius:16, boxShadow:"0 16px 44px rgba(0,0,0,0.1)",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:13 }}>
                <div style={{
                  width:44, height:44, borderRadius:"50%",
                  border:"3px solid rgba(33,112,228,0.25)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <span style={{ color:"#2170e4", fontWeight:700, fontSize:13 }}>94</span>
                </div>
                <div>
                  <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#4d4d54", margin:0 }}>
                    {t("landing.atsPerformance")}
                  </p>
                  <p style={{ fontSize:13, fontWeight:600, color:"#0a0a0b", margin:"2px 0 0" }}>
                    {t("landing.scoreOptimized")}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Revision chip */}
            <div className="anim-float-4 glass-panel" style={{
              position:"absolute", bottom:-16, right:10, zIndex:20,
              padding:"13px 16px", borderRadius:16, maxWidth:230,
              boxShadow:"0 16px 44px rgba(0,0,0,0.1)",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:9 }}>
                <Zap size={15} fill="#2170e4" color="#2170e4" />
                <span style={{ fontSize:12, fontWeight:700, color:"#0a0a0b" }}>
                  {t("landing.aiRevisionActive")}
                </span>
              </div>
              <p style={{ fontSize:13, color:"#4d4d54", fontStyle:"italic", lineHeight:1.6, margin:0 }}>
                {phase === "improved" ? (
                  <span>{aiText}{aiText.length < AI_RESULT.length && <span className="cursor" />}</span>
                ) : (
                  <span>{rawText}{phase === "original" && rawText.length < RAW.length && <span className="cursor" />}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Narrative Section ── */}
      <section style={{ maxWidth:C, margin:"0 auto", padding:"88px 30px" }}>
        <div className="home-feat-grid">

          {/* Left sticky */}
          <div className="feat-sticky" style={{ position:"sticky", top:96, display:"flex", flexDirection:"column" }}>
            <div style={{ marginBottom:36 }}>
              <h2 style={{
                fontFamily:"Hanken Grotesk, sans-serif",
                fontSize:"clamp(29px, 3.5vw, 40px)",
                fontWeight:800, letterSpacing:"-0.025em",
                color:"#0a0a0b", lineHeight:1.15,
                background:"linear-gradient(135deg, #0a0a0b 0%, #4d4d54 100%)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                margin:"0 0 18px",
              }}>
                {t("landing.engineeredTitle")}
              </h2>
              <p style={{ fontSize:17, color:"#4d4d54", lineHeight:1.7, fontWeight:400, margin:0 }}>
                {t("landing.engineeredSubtitle")}
              </p>
            </div>

            {/* Feature points */}
            <div style={{ display:"flex", flexDirection:"column", gap:26 }}>
              {[
                { icon:Shield,   color:"#2170e4", titleKey:"landing.secureTitle",     descKey:"landing.secureDesc" },
                { icon:Download, color:"#ef4444", titleKey:"landing.pdfTitle",         descKey:"landing.pdfDesc" },
                { icon:CopyPlus, color:"#3b82f6", titleKey:"landing.versioningTitle",  descKey:"landing.versioningDesc" },
              ].map(({ icon:Icon, color, titleKey, descKey }) => (
                <div key={titleKey} style={{ display:"flex", gap:17, alignItems:"flex-start" }}>
                  <div style={{
                    width:46, height:46, flexShrink:0, borderRadius:13,
                    background:"white", border:"1px solid #e2e2e9",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
                  }}>
                    <Icon size={20} color={color} />
                  </div>
                  <div>
                    <p style={{ fontSize:17, fontWeight:700, color:"#0a0a0b", margin:"0 0 5px" }}>
                      {t(titleKey)}
                    </p>
                    <p style={{ fontSize:14, color:"#4d4d54", lineHeight:1.6, margin:0 }}>
                      {t(descKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right cards */}
          <div style={{ display:"flex", flexDirection:"column", gap:22 }}>

            {/* AI Synthesis card */}
            <div className="feat-card" style={{
              position:"relative", background:"white",
              border:"1px solid #e2e2e9", borderRadius:38,
              padding:"44px 48px", boxShadow:"0 1px 4px rgba(0,0,0,0.03)",
              overflow:"hidden", flex:1,
            }}>
              <div style={{
                position:"absolute", inset:0, borderRadius:38,
                background:"linear-gradient(135deg, rgba(33,112,228,0.04) 0%, transparent 60%)",
                pointerEvents:"none",
              }} />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:30 }}>
                <div>
                  <h3 style={{ fontFamily:"Hanken Grotesk, sans-serif", fontSize:24, fontWeight:700, margin:"0 0 9px", color:"#0a0a0b" }}>
                    {t("landing.aiSynthesisTitle")}
                  </h3>
                  <p style={{ fontSize:14, color:"#4d4d54", maxWidth:320, margin:0, lineHeight:1.6 }}>
                    {t("landing.aiSynthesisDesc")}
                  </p>
                </div>
                <span style={{ fontSize:38, opacity:0.15, color:"#2170e4" }}>⬡</span>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                {/* Raw */}
                <div style={{
                  padding:"15px 18px", background:"#f8f9fb",
                  borderRadius:13, border:"1px solid rgba(226,226,233,0.6)",
                  position:"relative", overflow:"hidden",
                }}>
                  <div style={{ position:"absolute", left:0, top:0, width:3, height:"100%", background:"#2170e4", borderRadius:"2px 0 0 2px" }} />
                  <p style={{ fontSize:11, fontWeight:700, color:"#2170e4", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 5px", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:"#2170e4", display:"inline-block" }} />
                    {t("landing.rawExp")}
                  </p>
                  <p style={{ fontSize:13, color:"#4d4d54", margin:0, lineHeight:1.6 }}>
                    "
                    {phase === "improved" ? RAW : rawText}
                    {phase === "original" && rawText.length < RAW.length && <span className="cursor" />}
                    "
                  </p>
                </div>

                {/* Arrow */}
                <div style={{ display:"flex", justifyContent:"center" }}>
                  <span className="anim-bounce" style={{ fontSize:20, color:"#2170e4" }}>↓</span>
                </div>

                {/* AI Result */}
                <div style={{ padding:"15px 18px", background:"#0a0a0b", borderRadius:13, overflow:"hidden" }}>
                  <p style={{ fontSize:11, fontWeight:700, color:"rgba(33,112,228,0.9)", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 5px", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:11 }}>✦</span>
                    {t("landing.aiOptimized")}
                  </p>
                  <p style={{ fontSize:13, fontWeight:500, color:"white", margin:0, lineHeight:1.6 }}>
                    "
                    {phase === "improved" ? (
                      <span>{aiText}{aiText.length < AI_RESULT.length && <span className="cursor" />}</span>
                    ) : phase === "improving" ? (
                      <span style={{ color:"rgba(255,255,255,0.4)", fontStyle:"italic" }}>Improving…</span>
                    ) : RAW}
                    "
                  </p>
                </div>
              </div>
            </div>

            {/* 2-col grid */}
            <div className="home-card-grid">
              {/* Customization */}
              <div className="feat-card" style={{
                background:"white", border:"1px solid #e2e2e9",
                borderRadius:38, padding:"40px 44px",
                display:"flex", flexDirection:"column", justifyContent:"space-between",
                boxShadow:"0 1px 4px rgba(0,0,0,0.03)",
              }}>
                <div>
                  <h3 style={{ fontFamily:"Hanken Grotesk, sans-serif", fontSize:20, fontWeight:700, margin:"0 0 11px", color:"#0a0a0b" }}>
                    {t("landing.customizeTitle")}
                  </h3>
                  <p style={{ fontSize:13, color:"#4d4d54", lineHeight:1.6, margin:0 }}>
                    {t("landing.customizeDesc")}
                  </p>
                </div>
                <div style={{ marginTop:22 }}>
                  <div style={{ display:"flex", gap:9, marginBottom:13 }}>
                    {["#0a0a0b","#2170e4","#cbd5e1"].map((c) => (
                      <div key={c} style={{ width:30, height:30, borderRadius:"50%", background:c, outline:c==="#0a0a0b"?"2px solid #0a0a0b":"none", outlineOffset:2 }} />
                    ))}
                  </div>
                  <div style={{
                    padding:"11px 15px", background:"#f8f9fb",
                    borderRadius:11, border:"1px solid #e2e2e9",
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                  }}>
                    <span style={{ fontSize:14, fontFamily:"Hanken Grotesk, sans-serif", fontWeight:700 }}>Hanken Grotesk</span>
                    <span style={{ fontSize:15, opacity:0.35, color:"#0a0a0b" }}>⌄</span>
                  </div>
                </div>
              </div>

              {/* Designer Systems */}
              <div className="feat-card-alt" style={{
                background:"#f2f4f6", borderRadius:38,
                padding:"40px 44px", overflow:"hidden", position:"relative",
                border:"1px solid transparent",
              }}>
                <div style={{ position:"relative", zIndex:1 }}>
                  <h3 style={{ fontFamily:"Hanken Grotesk, sans-serif", fontSize:20, fontWeight:700, margin:"0 0 11px", color:"#0a0a0b" }}>
                    {t("landing.designSystemTitle")}
                  </h3>
                  <p style={{ fontSize:13, color:"#4d4d54", lineHeight:1.6, margin:0 }}>
                    {t("landing.designSystemDesc")}
                  </p>
                </div>
                <div style={{
                  marginTop:22, background:"white", borderRadius:11,
                  padding:15, border:"1px solid #e2e2e9",
                  boxShadow:"0 4px 16px rgba(0,0,0,0.06)",
                }}>
                  {[["33%","#e2e2e9"],["100%","#eceef0"],["83%","#eceef0"]].map(([w,bg],i) => (
                    <div key={i} style={{ height:i===0?11:8, width:w, background:bg, borderRadius:4, marginBottom:i<2?9:0 }} />
                  ))}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 3fr", gap:9, marginTop:11 }}>
                    <div style={{ height:38, background:"#eceef0", borderRadius:7 }} />
                    <div style={{ height:38, background:"#eceef0", borderRadius:7 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dark CTA ── */}
      <section style={{ maxWidth:C, margin:"0 auto", padding:"0 30px 88px" }}>
        <div style={{
          position:"relative", background:"#0a0a0b",
          borderRadius:48, padding:"80px 53px",
          overflow:"hidden", textAlign:"center",
        }}>
          <div style={{ position:"absolute", inset:0, opacity:0.12, pointerEvents:"none" }}>
            <div style={{ position:"absolute", top:26, left:26, width:220, height:220, background:"#2170e4", borderRadius:"50%", filter:"blur(88px)" }} />
            <div style={{ position:"absolute", bottom:26, right:26, width:330, height:330, background:"white", borderRadius:"50%", filter:"blur(110px)" }} />
          </div>
          <div style={{ position:"relative", zIndex:1, maxWidth:600, margin:"0 auto" }}>
            <h2 style={{
              fontFamily:"Hanken Grotesk, sans-serif",
              fontSize:"clamp(31px, 4.4vw, 50px)",
              fontWeight:800, color:"white",
              letterSpacing:"-0.03em", lineHeight:1.15,
              margin:"0 0 22px",
            }}>
              {t("landing.ctaTitle")}
            </h2>
            <p style={{ fontSize:17, color:"rgba(255,255,255,0.55)", lineHeight:1.7, margin:"0 0 44px", fontWeight:400 }}>
              {t("landing.ctaSubtitle")}
            </p>
            <div style={{ display:"flex", gap:15, justifyContent:"center", flexWrap:"wrap" }}>
              <button
                onClick={() => navigate(user ? "/app" : "/signup")}
                style={{
                  padding:"14px 35px", background:"white", color:"#0a0a0b",
                  fontWeight:700, fontSize:15, borderRadius:18, border:"none",
                  cursor:"pointer", boxShadow:"0 4px 16px rgba(255,255,255,0.15)",
                  transition:"all 0.2s", fontFamily:"Inter, sans-serif",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background="#f3f4f6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background="white"; }}
              >
                {t("landing.ctaBuild")}
              </button>
              <button
                onClick={() => navigate("/pricing")}
                style={{
                  padding:"14px 35px", background:"rgba(255,255,255,0.08)",
                  color:"white", fontWeight:700, fontSize:15,
                  borderRadius:18, border:"1px solid rgba(255,255,255,0.18)",
                  cursor:"pointer", backdropFilter:"blur(8px)",
                  transition:"all 0.2s", fontFamily:"Inter, sans-serif",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background="rgba(255,255,255,0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; }}
              >
                {t("landing.ctaViewPricing")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
