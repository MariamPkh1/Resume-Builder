import React, { useState, useEffect, useRef } from "react";
import { Loader2, Check } from "lucide-react";
import { colorStyle } from "./labelColors";
import api from "../../services/api";

const LabelPopover = ({ cvId, cvLabels, allLabels, anchorRef, onUpdate, onClose }) => {
  const [loading, setLoading] = useState(null);
  const [localLabels, setLocalLabels] = useState(cvLabels);
  const popoverRef = useRef(null);

  useEffect(() => {
    setLocalLabels(cvLabels);
  }, [cvLabels]);

  useEffect(() => {
    const handler = (e) => {
      const anchor = anchorRef?.current ?? popoverRef?.current;
      if (anchor && !anchor.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const toggle = async (label) => {
    const isAttached = localLabels.some((l) => l.id === label.id);
    // Optimistic flip
    setLocalLabels((prev) =>
      isAttached ? prev.filter((l) => l.id !== label.id) : [...prev, label]
    );
    setLoading(label.id);
    try {
      const endpoint = isAttached
        ? `/api/cvs/${cvId}/remove-label/`
        : `/api/cvs/${cvId}/add-label/`;
      const res = await api.post(endpoint, { label_id: label.id });
      onUpdate(cvId, res.data.labels);
    } catch {
      setLocalLabels(cvLabels); // revert on failure
      alert("Failed to update label.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      ref={popoverRef}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute top-full left-0 mt-1 z-[100] bg-white rounded-xl shadow-xl border border-slate-100 w-52 py-1.5 max-h-64 overflow-y-auto"
    >
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1.5">
        Labels
      </p>

      {allLabels.length === 0 && (
        <p className="text-[10px] text-slate-400 px-3 py-2">No labels yet.</p>
      )}

      {allLabels.map((label) => {
        const attached = localLabels.some((l) => l.id === label.id);
        const s = colorStyle(label.color);
        return (
          <button
            key={label.id}
            onClick={() => toggle(label)}
            disabled={loading === label.id}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.text }} />
              <span className="text-[11px] font-medium text-slate-700">{label.name}</span>
            </span>
            {loading === label.id
              ? <Loader2 size={10} className="animate-spin text-slate-400" />
              : attached
              ? <Check size={10} className="text-emerald-500" />
              : null}
          </button>
        );
      })}

      <div className="border-t border-slate-100 mt-1 pt-1">
        <button
          onClick={onClose}
          className="w-full text-left px-3 py-2 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default LabelPopover;