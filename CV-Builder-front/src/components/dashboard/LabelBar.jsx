import React from "react";
import { Tag, X, Archive, LayoutGrid } from "lucide-react";
import { colorStyle } from "./labelColors";
import { useLanguage } from "../../context/LanguageContext";

const T = {
  surface: "#ffffff",
  surfaceContainer: "#eceef0",
  primary: "#000000",
  onPrimary: "#ffffff",
  onSurface: "#191c1e",
  onSurfaceVariant: "#45464d",
  outline: "#76777d",
  outlineVariant: "rgba(198,198,205,0.35)",
  fontBody: "'Inter', -apple-system, sans-serif",
};

const PillBtn = ({ active, onClick, icon, children, dashed }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "5px 13px", borderRadius: 9999,
      border: dashed
        ? `1px dashed ${T.outlineVariant}`
        : `1px solid ${active ? T.primary : T.outlineVariant}`,
      background: active ? T.primary : T.surface,
      color: active ? T.onPrimary : T.onSurfaceVariant,
      fontSize: 11, fontWeight: 600,
      cursor: "pointer", transition: "all 0.15s",
      whiteSpace: "nowrap",
      fontFamily: T.fontBody,
      letterSpacing: "0.02em",
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.borderColor = T.outline;
        e.currentTarget.style.color = T.onSurface;
        e.currentTarget.style.background = T.surfaceContainer;
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.borderColor = T.outlineVariant;
        e.currentTarget.style.color = T.onSurfaceVariant;
        e.currentTarget.style.background = T.surface;
      }
    }}
  >
    {icon}
    {children}
  </button>
);

const LabelBar = ({
  tab,
  onTabChange,
  labels,
  filterLabel,
  onFilterChange,
  onDeleteLabel,
  onNewLabel,
}) => {
  const { t } = useLanguage();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <PillBtn
        active={tab === "active"}
        onClick={() => onTabChange("active")}
        icon={<LayoutGrid size={11} />}
      >
        {t("dashboard.active")}
      </PillBtn>

      <PillBtn
        active={tab === "archived"}
        onClick={() => onTabChange("archived")}
        icon={<Archive size={11} />}
      >
        {t("dashboard.archived")}
      </PillBtn>

      <PillBtn
        active={false}
        onClick={() => onFilterChange(null)}
      >
        {t("dashboard.all")}
      </PillBtn>

      {labels.map((label) => {
        const s = colorStyle(label.color);
        const active = filterLabel === label.id;
        return (
          <div key={label.id} style={{ position: "relative", display: "flex", alignItems: "center" }} className="label-pill-group">
            <button
              onClick={() => onFilterChange(active ? null : label.id)}
              style={{
                padding: "5px 13px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                border: `1px solid ${active ? s.text : s.border}`,
                background: active ? s.text : s.bg,
                color: active ? "#fff" : s.text,
                cursor: "pointer", transition: "all 0.15s",
                fontFamily: T.fontBody,
              }}
            >
              {label.name}
            </button>
            <button
              onClick={() => onDeleteLabel(label.id)}
              style={{
                position: "absolute", top: -5, right: -5,
                display: "none", width: 15, height: 15, borderRadius: "50%",
                background: "#fee2e2", border: "1px solid #fecaca",
                color: "#ef4444", alignItems: "center", justifyContent: "center",
                cursor: "pointer", padding: 0,
              }}
              className="label-delete-btn"
            >
              <X size={8} />
            </button>
          </div>
        );
      })}

      <PillBtn
        active={false}
        onClick={onNewLabel}
        icon={<Tag size={11} />}
        dashed
      >
        {t("dashboard.newLabel")}
      </PillBtn>

      <style>{`
        .label-pill-group:hover .label-delete-btn { display: flex !important; }
      `}</style>
    </div>
  );
};

export default LabelBar;
