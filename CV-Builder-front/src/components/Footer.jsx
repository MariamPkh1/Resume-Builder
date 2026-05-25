import React from "react";
import { useNavigate } from "react-router-dom";
import logo3 from "../assets/logo3.svg";
import { useLanguage } from "../context/LanguageContext";

const Footer = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const linkGroups = [
    {
      headingKey: "footer.product",
      items: [
        { labelKey: "nav.templates", path: "/templates" },
        { labelKey: "nav.pricing", path: "/pricing" },
        { labelKey: "footer.features", path: null },
      ],
    },
    {
      headingKey: "footer.company",
      items: [
        { labelKey: "footer.about", path: null },
        { labelKey: "footer.blog", path: null },
        { labelKey: "footer.careers", path: null },
      ],
    },
    {
      headingKey: "footer.support",
      items: [
        { labelKey: "footer.helpCenter", path: null },
        { labelKey: "nav.contact", path: null },
        { labelKey: "footer.privacyPolicy", path: null },
      ],
    },
  ];

  const bottomLinks = [
    { labelKey: "footer.terms" },
    { labelKey: "footer.privacy" },
    { labelKey: "footer.cookies" },
  ];

  return (
    <footer
      style={{
        background: "#f8f9fb",
        borderTop: "1px solid #e2e8f0",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "56px 24px 28px",
        marginTop: 80,
        boxSizing: "border-box",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 32px !important;
          }
          .footer-brand {
            grid-column: 1 / -1 !important;
          }
          .footer-bottom {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
        @media (max-width: 480px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Top row */}
        <div
          className="footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 48,
            marginBottom: 48,
            alignItems: "start",
          }}
        >
          {/* Brand */}
          <div className="footer-brand" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <img
              src={logo3}
              alt="logo"
              style={{
                height: 52,
                width: "auto",
                display: "block",
                objectFit: "contain",
                objectPosition: "left top",
                marginTop: -16,
                marginBottom: 12,
              }}
            />
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                maxWidth: 240,
                color: "#94a3b8",
                margin: 0,
              }}
            >
              {t("footer.description")}
            </p>
          </div>

          {/* Link columns */}
          {linkGroups.map(({ headingKey, items }) => (
            <div key={headingKey}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  marginBottom: 16,
                  marginTop: 0,
                }}
              >
                {t(headingKey)}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {items.map(({ labelKey, path }) => (
                  <li key={labelKey} style={{ marginBottom: 10 }}>
                    <span
                      onClick={() => path && navigate(path)}
                      style={{
                        fontSize: 14,
                        color: "#64748b",
                        cursor: path ? "pointer" : "default",
                        transition: "color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (path) e.target.style.color = "#0f172a";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = "#64748b";
                      }}
                    >
                      {t(labelKey)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "linear-gradient(to right, transparent, #e2e8f0, transparent)",
            marginBottom: 24,
          }}
        />

        {/* Bottom row */}
        <div
          className="footer-bottom"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
            © {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <div style={{ display: "flex", gap: 24 }}>
            {bottomLinks.map(({ labelKey }) => (
              <span
                key={labelKey}
                style={{
                  fontSize: 13,
                  color: "#94a3b8",
                  cursor: "pointer",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#0f172a")}
                onMouseLeave={(e) => (e.target.style.color = "#94a3b8")}
              >
                {t(labelKey)}
              </span>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
