import React from "react";
import { Tag, X, Archive, LayoutTemplate } from "lucide-react";
import { colorStyle } from "./labelColors";

const LabelBar = ({
  tab,
  onTabChange,
  labels,
  filterLabel,
  onFilterChange,
  onDeleteLabel,
  onNewLabel,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {/* Active / Archived tabs */}
      <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 mr-2">
        {["active", "archived"].map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              tab === t
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            {t === "archived" ? <Archive size={11} /> : <LayoutTemplate size={11} />}
            {t}
          </button>
        ))}
      </div>

      {/* All pill */}
      <button
        onClick={() => onFilterChange(null)}
        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
          filterLabel === null
            ? "bg-slate-900 text-white border-slate-900"
            : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
        }`}
      >
        All
      </button>

      {/* Label filter pills */}
      {labels.map((label) => {
        const s = colorStyle(label.color);
        const active = filterLabel === label.id;
        return (
          <div key={label.id} className="relative flex items-center group">
            <button
              onClick={() => onFilterChange(active ? null : label.id)}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all"
              style={
                active
                  ? { background: s.text, color: "#fff", borderColor: s.text }
                  : { background: s.bg, color: s.text, borderColor: s.border }
              }
            >
              {label.name}
            </button>
            <button
              onClick={() => onDeleteLabel(label.id)}
              className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 rounded-full bg-red-100 border border-red-200 text-red-500 items-center justify-center hover:bg-red-200 transition-all"
            >
              <X size={8} />
            </button>
          </div>
        );
      })}

      {/* New label */}
      <button
        onClick={onNewLabel}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all"
      >
        <Tag size={10} /> New Label
      </button>
    </div>
  );
};

export default LabelBar;