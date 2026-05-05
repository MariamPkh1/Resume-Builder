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
        background: "#f5f6f8",
        fontFamily:
          "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

      .contact-wrapper {
        max-width: 1100px;
        margin: 0 auto;
      }

      .contact-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        align-items: stretch;
      }

      .column {
        display: flex;
        flex-direction: column;
        gap: 10px;
        height: 100%;
      }

      .info-card {
        background: #fff;
        border: 1px solid #e8eaed;
        border-radius: 8px;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 14px;
        transition: border-color .18s ease, box-shadow .18s ease;
        flex: 1;
      }

      .info-card:hover {
        border-color: #bfdbfe;
        box-shadow: 0 4px 16px rgba(59,130,246,0.07);
      }

      .icon-pill {
        width: 36px;
        height: 36px;
        border-radius: 6px;
        background: #f0f4ff;
        border: 1px solid #dce5ff;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .label {
        font-size: 10px;
        font-weight: 700;
        color: #a0aec0;
        text-transform: uppercase;
        letter-spacing: .1em;
        margin-bottom: 3px;
      }

      .value {
        font-size: 14px;
        font-weight: 600;
        color: #1a202c;
        line-height: 1.5;
      }

      .social-card {
        background: #fff;
        border: 1px solid #e8eaed;
        border-radius: 8px;
        padding: 16px 20px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .social-row {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .social-link {
        width: 34px;
        height: 34px;
        border-radius: 6px;
        border: 1px solid #e8eaed;
        background: #fafafa;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        text-decoration: none;
        transition: all .18s ease;
      }

      .social-link:hover {
        background: #f0f4ff;
        border-color: #bfdbfe;
        color: #2563eb;
      }

      .address-card {
        background: #fff;
        border: 1px solid #e8eaed;
        border-radius: 8px;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 14px;
        transition: border-color .18s ease;
      }

      .address-card:hover {
        border-color: #bfdbfe;
      }

      .map-box {
        flex: 1;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e8eaed;
        min-height: 260px;
      }

      .map-box iframe {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
      }

      @media(max-width: 900px) {
        .contact-grid {
          grid-template-columns: 1fr;
        }
      }
      `}</style>

      <NavBar />

      <section style={{ padding: "120px 20px 80px" }}>
        <div className="contact-wrapper">

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <h1
              style={{
                fontSize: "clamp(22px, 3vw, 32px)",
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: 6,
                letterSpacing: "-0.02em",
              }}
            >
              <span
                style={{
                  background: "linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t("contact.title")}
              </span>
            </h1>
            <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
              {t("contact.subtitle")}
            </p>
          </div>

          <div className="contact-grid">

            {/* LEFT COLUMN */}
            <div className="column">

              {/* Email */}
              <div className="info-card" style={{ flex: "0 0 auto", minHeight: 100 }}>
                <div className="icon-pill">
                  <Mail size={16} color="#3b82f6" />
                </div>
                <div>
                  <div className="label">{t("contact.email")}</div>
                  <div className="value">info@nebulahub.ai</div>
                </div>
              </div>

              {/* Phone + Social stacked */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>

                <div className="info-card" style={{ flex: 1 }}>
                  <div className="icon-pill">
                    <Phone size={16} color="#3b82f6" />
                  </div>
                  <div>
                    <div className="label">{t("contact.phone")}</div>
                    <div className="value">+995 571 33 33 03</div>
                    <div className="value">+995 579 58 88 59</div>
                  </div>
                </div>

                <div className="social-card" style={{ flex: 1 }}>
                  <div className="label">{t("contact.socialMedia")}</div>
                  <div className="social-row">
                    <a
                      href="https://www.facebook.com/profile.php?id=61573891437689"
                      target="_blank"
                      rel="noreferrer"
                      className="social-link"
                      aria-label="Facebook"
                    >
                      <Facebook size={15} />
                    </a>
                    <a
                      href="https://www.linkedin.com/company/nebula-ai-hub/posts/?feedView=all"
                      target="_blank"
                      rel="noreferrer"
                      className="social-link"
                      aria-label="LinkedIn"
                    >
                      <Linkedin size={15} />
                    </a>
                  </div>
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN */}
            <div className="column">

              <div className="address-card" style={{ flex: "0 0 auto", minHeight: 100 }}>
                <div className="icon-pill">
                  <MapPin size={16} color="#3b82f6" />
                </div>
                <div>
                  <div className="label">{t("contact.address")}</div>
                  <div className="value">{t("contact.addressValue")}</div>
                </div>
              </div>

              <div className="map-box">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d47237.02935788529!2d42.702797!3d42.271813!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x405c8ce30e54af2d%3A0x5fffe6dd67ced171!2s7PC3%2BP4F%2C%20Kutaisi!5e0!3m2!1sen!2sge!4v1772718537039!5m2!1sen!2sge"
                  title={t("contact.mapTitle")}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
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