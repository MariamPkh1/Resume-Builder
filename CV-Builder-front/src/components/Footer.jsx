import React from "react";
import { useNavigate } from "react-router-dom";
import logo3 from "../assets/logo3.svg";
import { useLanguage } from "../context/LanguageContext";

const Footer = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const linkGroups = [
    {
      heading: t("footer.product"),
      items: [
        { label: t("nav.templates"), path: "/templates" },
        { label: t("nav.pricing"), path: "/pricing" },
      ],
    },
    {
      heading: t("footer.company"),
      items: [
        { label: t("footer.about"), path: null },
        { label: t("nav.contact"), path: "/contact" },
        { label: t("nav.pricing"), path: "/pricing" },
      ],
    },
  ];

  return (
    <footer style={{
      background: "white",
      borderTop: "1px solid #e2e8f0",
      fontFamily: "Inter, sans-serif",
      padding: "52px 28px 28px",
      boxSizing: "border-box",
      width: "100%",
      overflowX: "hidden",
    }}>
      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
          .footer-brand { grid-column: 1 / -1 !important; }
          .footer-bottom { flex-direction: column !important; align-items: flex-start !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          className="footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: 48,
            marginBottom: 40,
            alignItems: "start",
          }}
        >
          {/* Brand */}
          <div className="footer-brand" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <img
              src={logo3}
              alt="Nebula AI"
              style={{
                height: 48, width: "auto", display: "block",
                objectFit: "contain", objectPosition: "left top",
                marginTop: -14, marginBottom: 14,
              }}
            />
            <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 240, color: "#94a3b8", margin: 0 }}>
              {t("footer.description")}
            </p>
          </div>

          {/* Link columns */}
          {linkGroups.map(({ heading, items }) => (
            <div key={heading}>
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "#94a3b8",
                marginBottom: 16, marginTop: 0,
              }}>
                {heading}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {items.map(({ label, path }) => (
                  <li key={label} style={{ marginBottom: 10 }}>
                    <span
                      onClick={() => path && navigate(path)}
                      style={{
                        fontSize: 14, color: "#64748b",
                        cursor: path ? "pointer" : "default",
                        transition: "color 0.15s ease",
                      }}
                      onMouseEnter={(e) => { if (path) e.target.style.color = "#0f172a"; }}
                      onMouseLeave={(e) => { e.target.style.color = "#64748b"; }}
                    >
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: "linear-gradient(to right, transparent, #e2e8f0, transparent)",
          marginBottom: 24,
        }} />

        {/* Bottom row */}
        <div
          className="footer-bottom"
          style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", flexWrap: "wrap", gap: 12,
          }}
        >
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
            © {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { key: "footer.terms", path: null },
              { key: "footer.privacy", path: null },
              { key: "nav.contact", path: "/contact" },
            ].map(({ key, path }) => (
              <span
                key={key}
                onClick={() => path && navigate(path)}
                style={{
                  fontSize: 13, color: "#94a3b8",
                  cursor: path ? "pointer" : "default",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#0f172a")}
                onMouseLeave={(e) => (e.target.style.color = "#94a3b8")}
              >
                {t(key)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
