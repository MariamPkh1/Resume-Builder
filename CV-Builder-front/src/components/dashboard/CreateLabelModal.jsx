import React, { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { LABEL_COLORS } from "./labelColors";
import api from "../../services/api";
import { showToast } from "../../utils/toast";

const CreateLabelModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState("gray");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/api/labels/", { name: name.trim(), color });
      onCreate(res.data);
      onClose();
    } catch (err) {
      const nameError = err?.response?.data?.name?.[0];
      showToast({ message: nameError ?? "Failed to create label." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">New Label</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Label name…"
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 mb-4"
        />

        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Color</p>
        <div className="flex gap-2 mb-6">
          {LABEL_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => setColor(c.name)}
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{
                background: c.bg,
                borderColor: color === c.name ? c.text : c.border,
                boxShadow: color === c.name ? `0 0 0 2px ${c.text}40` : "none",
              }}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-[11px] font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="flex-1 py-2 text-[11px] font-bold text-white bg-slate-900 rounded-xl hover:bg-blue-600 transition-all uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateLabelModal;