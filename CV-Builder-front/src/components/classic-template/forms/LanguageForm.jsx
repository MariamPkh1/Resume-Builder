import React from "react";
import { Languages, Trash2, Plus, X, GripVertical } from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";

const LanguageForm = ({ section, setResumeData, dragHandleProps, onDeleteSection }) => {
  const { t } = useLanguage();

  const addEntry = () => {
    const newItem = { id: Date.now(), language: "", level: "Native" };
    setResumeData(prev => ({ ...prev, sections: prev.sections.map(s => s.id === section.id ? { ...s, items: [...(s.items || []), newItem] } : s) }));
  };

  const updateItem = (itemId, field, value) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.map(s => {
        if (s.id !== section.id) return s;
        return { ...s, items: s.items.map(item => item.id === itemId ? { ...item, [field]: value } : item) };
      })
    }));
  };

  const deleteEntry = (itemId) => {
    setResumeData(prev => ({ ...prev, sections: prev.sections.map(s => s.id === section.id ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s) }));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div
          {...dragHandleProps}
          className="flex items-center gap-2 cursor-grab"
        >
          <GripVertical size={14} className="text-gray-300" />
          <Languages size={15} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-700">{section.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDeleteSection}
            className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
          >
            <X size={14} />
          </button>
          <button
            onClick={addEntry}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <Plus size={12} /> {t("form.addLanguage")}
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 gap-3">
        {section.items?.map((item) => (
          <div key={item.id} className="group relative flex gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 transition-all">
            <button
              onClick={() => deleteEntry(item.id)}
              className="absolute -top-1.5 -right-1.5 p-1 text-gray-400 hover:text-red-500 bg-white border border-gray-200 rounded-full shadow-sm transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={10} />
            </button>
            <input
              placeholder="e.g. English"
              className="flex-1 p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-all text-sm text-gray-800 placeholder:text-gray-300 min-w-0"
              value={item.language || ""}
              onChange={(e) => updateItem(item.id, "language", e.target.value)}
            />
            <select
              className="p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-all text-xs text-gray-600 cursor-pointer"
              value={item.level || "Native"}
              onChange={(e) => updateItem(item.id, "level", e.target.value)}
            >
              <option>Native</option>
              <option>Fluent</option>
              <option>Professional</option>
              <option>Intermediate</option>
              <option>Basic</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LanguageForm;