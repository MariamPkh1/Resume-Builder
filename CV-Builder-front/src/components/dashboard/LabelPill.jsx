import React from "react";
import { colorStyle } from "./labelColors";

const LabelPill = ({ label }) => {
  const s = colorStyle(label.color);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {label.name}
    </span>
  );
};

export default LabelPill;