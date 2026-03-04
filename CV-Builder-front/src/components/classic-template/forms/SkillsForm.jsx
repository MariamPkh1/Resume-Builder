import React from "react";
import { Code, Trash2, X, Plus, GripVertical } from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";

const SkillsForm = ({ section, setResumeData, dragHandleProps, onDeleteSection }) => {
  const { t } = useLanguage();

  const addSkill = () => {
    const newItem = { id: Date.now(), name: "" };
    setResumeData(prev => ({ ...prev, sections: prev.sections.map(s => s.id === section.id ? { ...s, items: [...(s.items || []), newItem] } : s) }));
  };

  const updateSkill = (itemId, value) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.map(s => {
        if (s.id !== section.id) return s;
        return { ...s, items: s.items.map(item => item.id === itemId ? { ...item, name: value } : item) };
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
          <Code size={15} className="text-gray-400" />
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
            onClick={addSkill}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <Plus size={12} /> {t("form.addSkill")}
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 gap-3">
        {section.items?.map((item) => (
          <div key={item.id} className="group relative">
            <input
              placeholder="e.g. React.js"
              className="w-full p-2.5 pr-8 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:bg-white transition-all text-sm text-gray-800 placeholder:text-gray-300"
              value={item.name || ""}
              onChange={(e) => updateSkill(item.id, e.target.value)}
            />
            <button
              onClick={() => deleteEntry(item.id)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-400 rounded transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillsForm;