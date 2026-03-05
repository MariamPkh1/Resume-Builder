import React from "react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { Mail, Phone, MapPin, Facebook, Linkedin } from "lucide-react";

const Contact = () => {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8f9fb",
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cu-1 { animation: fadeUp 0.6s cubic-bezier(.22,1,.36,1) 0.05s both; }
        .cu-2 { animation: fadeUp 0.6s cubic-bezier(.22,1,.36,1) 0.13s both; }

        .info-card {
          background: white;
          border: 1px solid #eef0f3;
          border-radius: 16px;
          padding: 20px 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 4px rgba(15,23,42,0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          text-decoration: none;
        }
        .info-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15,23,42,0.08);
          border-color: #bfdbfe;
        }

        .icon-pill {
          width: 42px; height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #eff6ff, #e0e7ff);
          border: 1px solid #c7d7fe;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .social-link {
          width: 42px; height: 42px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1.5px solid #e8edf4;
          display: flex; align-items: center; justify-content: center;
          color: #64748b; text-decoration: none;
          transition: all 0.2s;
        }
        .social-link:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #2563eb;
          transform: translateY(-2px);
        }

        @media (max-width: 640px) {
          .cu-section { padding: 96px 16px 60px !important; }
          .cu-cards { max-width: 100% !important; }
        }
      `}</style>

      <NavBar />

      <section className="cu-section" style={{ padding: "116px 24px 80px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>

          {/* Heading */}
          <div className="cu-1" style={{ marginBottom: 36 }}>
            <h1 style={{
              fontSize: "clamp(22px, 3vw, 34px)",
              fontWeight: 800, letterSpacing: "-0.025em",
              color: "#0f172a", margin: "0 0 7px",
            }}>
              We'd love to{" "}
              <span style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                hear from you
              </span>
            </h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
              Have a question or want to work together? Drop us a message and we'll get back to you shortly.
            </p>
          </div>

          {/* Info cards */}
          <div className="cu-2 cu-cards" style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            <a href="mailto:info@resumeflowai.com" className="info-card">
              <div className="icon-pill"><Mail size={17} color="#3b82f6" /></div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>Email</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>info@resumeflowai.com</p>
              </div>
            </a>

            <div className="info-card" style={{ cursor: "default" }}>
              <div className="icon-pill"><Phone size={17} color="#3b82f6" /></div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>Phone</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: "0 0 1px" }}>+995 571 33 33 03</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>+995 579 58 88 59</p>
              </div>
            </div>

            <div className="info-card" style={{ cursor: "default" }}>
              <div className="icon-pill"><MapPin size={17} color="#3b82f6" /></div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>Address</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>Tbilisi, Georgia</p>
              </div>
            </div>

            {/* Social */}
            <div style={{
              background: "white", border: "1px solid #eef0f3",
              borderRadius: 16, padding: "18px 22px",
              boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>Social Media</p>
              <div style={{ display: "flex", gap: 8 }}>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-link">
                  <Facebook size={16} />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-link">
                  <Linkedin size={16} />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;