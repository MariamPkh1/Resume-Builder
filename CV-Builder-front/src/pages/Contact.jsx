import React from "react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { Mail, Phone, MapPin, Facebook, Linkedin } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const Contact = () => {
  const { t } = useLanguage();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f9fb",
        fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap');

      .contact-wrapper {
        max-width: 1100px;
        margin: 0 auto;
      }

      .contact-grid {
        display: grid;
        grid-template-columns: 1fr 1.3fr;
        gap: 16px;
        align-items: stretch;
      }

      .left-column {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .right-column {
        display: flex;
        flex-direction: column;
      }

      .info-card {
        background: #ffffff;
        border: 1px solid #e5eeff;
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        align-items: flex-start;
        gap: 16px;
        transition: border-color .18s ease, box-shadow .18s ease;
      }

      .info-card:hover {
        border-color: #b4c5ff;
        box-shadow: 0 4px 20px rgba(0,81,213,0.06);
      }

      .icon-pill {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: #e8edf5;
        border: 1px solid #d0d8e8;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .card-label {
        font-size: 10px;
        font-weight: 700;
        color: #45464d;
        text-transform: uppercase;
        letter-spacing: .1em;
        margin-bottom: 4px;
      }

      .card-title {
        font-size: 15px;
        font-weight: 700;
        color: #0b1c30;
        line-height: 1.4;
        margin-bottom: 3px;
      }

      .card-value {
        font-size: 13px;
        font-weight: 400;
        color: #45464d;
        line-height: 1.6;
      }

      .card-value-link {
        font-size: 13px;
        font-weight: 500;
        color: #0051d5;
        text-decoration: none;
        line-height: 1.6;
      }

      .card-value-link:hover {
        text-decoration: underline;
      }

      .social-row {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-top: 12px;
      }

      .social-label {
        font-size: 10px;
        font-weight: 700;
        color: #45464d;
        text-transform: uppercase;
        letter-spacing: .1em;
      }

      .social-btn {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        border: 1px solid #d0d8e8;
        background: #e8edf5;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #3c4455;
        text-decoration: none;
        transition: background .15s ease, border-color .15s ease;
      }

      .social-btn:hover {
        background: #dde3ed;
        border-color: #bcc5d8;
      }

      .map-box {
        flex: 1;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #e5eeff;
        min-height: 380px;
        position: relative;
      }

      .map-box iframe {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
      }

      .map-overlay {
        position: absolute;
        top: 16px;
        left: 16px;
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        padding: 10px 16px 10px 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        pointer-events: none;
      }

      .map-overlay-pin {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #0b1c30;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .map-overlay-label {
        font-size: 10px;
        font-weight: 700;
        color: #45464d;
        text-transform: uppercase;
        letter-spacing: .08em;
        margin-bottom: 2px;
      }

      .map-overlay-city {
        font-size: 15px;
        font-weight: 700;
        color: #0b1c30;
        line-height: 1.2;
      }

      @media(max-width: 900px) {
        .contact-grid {
          grid-template-columns: 1fr;
        }
        .map-box {
          min-height: 280px;
        }
      }
      `}</style>

      <NavBar />

      <section style={{ padding: "120px 20px 80px", zoom: 0.9 }}>
        <div className="contact-wrapper">

          {/* Heading */}
          <div style={{ marginBottom: 40 }}>
            <h1
              style={{
                fontSize: "clamp(28px, 4vw, 48px)",
                fontWeight: 800,
                color: "#0b1c30",
                marginBottom: 8,
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
              }}
            >
              {t("contact.title")}
            </h1>
            <p style={{ color: "#45464d", fontSize: 16, margin: 0, lineHeight: 1.6, maxWidth: 420 }}>
              {t("contact.subtitle")}
            </p>
          </div>

          <div className="contact-grid">

            {/* LEFT COLUMN */}
            <div className="left-column">

              {/* Email */}
              <div className="info-card">
                <div className="icon-pill">
                  <Mail size={18} color="#3c4455" />
                </div>
                <div>
                  <div className="card-label">{t("contact.email")}</div>
                  <a href="mailto:info@nebulahub.ai" className="card-value-link">info@nebulahub.ai</a>
                </div>
              </div>

              {/* Address */}
              <div className="info-card">
                <div className="icon-pill">
                  <MapPin size={18} color="#3c4455" />
                </div>
                <div>
                  <div className="card-label">{t("contact.address")}</div>
                  <div className="card-value">{t("contact.addressValue")}</div>
                </div>
              </div>

              {/* Phone */}
              <div className="info-card">
                <div className="icon-pill">
                  <Phone size={18} color="#3c4455" />
                </div>
                <div>
                  <div className="card-label">{t("contact.phone")}</div>
                  <div className="card-value">+995 571 33 33 03</div>
                  <div className="card-value">+995 579 58 88 59</div>
                </div>
              </div>

              {/* Social */}
              <div className="social-row">
                <span className="social-label">{t("contact.socialMedia") || "Connect"}</span>
                <a
                  href="https://www.facebook.com/profile.php?id=61573891437689"
                  target="_blank"
                  rel="noreferrer"
                  className="social-btn"
                  aria-label="Facebook"
                >
                  <Facebook size={18} color="#3c4455" />
                </a>
                <a
                  href="https://www.linkedin.com/company/nebula-ai-hub/posts/?feedView=all"
                  target="_blank"
                  rel="noreferrer"
                  className="social-btn"
                  aria-label="LinkedIn"
                >
                  <Linkedin size={18} color="#3c4455" />
                </a>
              </div>

            </div>

            {/* RIGHT COLUMN — Map */}
            <div className="right-column">
              <div className="map-box">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d47237.02935788529!2d42.702797!3d42.271813!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x405c8ce30e54af2d%3A0x5fffe6dd67ced171!2s7PC3%2BP4F%2C%20Kutaisi!5e0!3m2!1sen!2sge!4v1772718537039!5m2!1sen!2sge"
                  title={t("contact.mapTitle")}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="map-overlay">
                  <div className="map-overlay-pin">
                    <MapPin size={16} color="#ffffff" />
                  </div>
                  <div>
                    <div className="map-overlay-label">Current Office</div>
                    <div className="map-overlay-city">Kutaisi, Georgia</div>
                  </div>
                </div>
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