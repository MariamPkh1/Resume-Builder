import React from "react";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  const links = {
    Product: [
      { label: "Templates", path: "/templates" },
      { label: "Pricing", path: "/pricing" },
      { label: "Features", path: null },
    ],
    Company: [
      { label: "About", path: null },
      { label: "Blog", path: null },
      { label: "Careers", path: null },
    ],
    Support: [
      { label: "Help Center", path: null },
      { label: "Contact", path: null },
      { label: "Privacy Policy", path: null },
    ],
  };

  return (
    <footer
      style={{
        background: "#f8f9fb",
        borderTop: "1px solid #e2e8f0",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "56px 24px 28px",
        marginTop: 80,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Top row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 48,
            marginBottom: 48,
            alignItems: "start",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <img
              src="/src/assets/logo3.svg"
              alt="logo"
              style={{
                height: 52,
                width: "auto",
                display: "block",
                objectFit: "contain",
                objectPosition: "left center",
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
              Build high-impact resumes in minutes with advanced AI. Beat ATS filters and land more interviews.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
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
                {heading}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {items.map(({ label, path }) => (
                  <li key={label} style={{ marginBottom: 10 }}>
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
                      {label}
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
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
            © {new Date().getFullYear()} NebulaAI. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: 24 }}>
            {["Terms", "Privacy", "Cookies"].map((item) => (
              <span
                key={item}
                style={{
                  fontSize: 13,
                  color: "#94a3b8",
                  cursor: "pointer",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#0f172a")}
                onMouseLeave={(e) => (e.target.style.color = "#94a3b8")}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;