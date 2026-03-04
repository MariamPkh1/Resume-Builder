import React from "react";
import { GraduationCap, Trash2, Plus, X, GripVertical } from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";

const EducationForm = ({ section, setResumeData, dragHandleProps, onDeleteSection }) => {
  const { t } = useLanguage();

  const addEntry = () => {
    const newItem = { id: Date.now(), school: "", degree: "", city: "", country: "", startDate: "", endDate: "", description: "" };
    setResumeData(prev => ({ ...prev, sections: prev.sections.map(s => s.id === section.id ? { ...s, items: [...(s.items || []), newItem] } : s) }));
  };

  const deleteEntry = (itemId) => {
    setResumeData(prev => ({ ...prev, sections: prev.sections.map(s => s.id === section.id ? { ...s, items: s.items.filter(item => item.id !== itemId) } : s) }));
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

  const deleteSection = () => {
    if (window.confirm(t("form.deleteSectionConfirm"))) {
      setResumeData(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== section.id) }));
    }
  };

  const fields = [
    { label: t("form.schoolUniversity"), key: "school", placeholder: "e.g. Harvard University" },
    { label: t("form.degreeMajor"), key: "degree", placeholder: "e.g. Bachelor of Science" },
    { label: t("form.city"), key: "city", placeholder: "e.g. London" },
    { label: t("form.country"), key: "country", placeholder: "e.g. UK" },
    { label: t("form.startDate"), key: "startDate", placeholder: "MM / YYYY" },
    { label: t("form.endDate"), key: "endDate", placeholder: "MM / YYYY" },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div
          {...dragHandleProps}
          className="flex items-center gap-2 cursor-grab"
        >
          <GripVertical size={14} className="text-gray-300" />
          <GraduationCap size={15} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-700">
            {section.title || t("resume.education")}
          </span>
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
            <Plus size={12} /> {t("form.addEducation")}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {section.items?.map((item) => (
          <div key={item.id} className="group relative p-5 bg-gray-50 border border-gray-100 rounded-xl space-y-4 hover:border-gray-200 transition-all">
            <button
              onClick={() => deleteEntry(item.id)}
              className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>

            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">{f.label}</label>
                  <input
                    placeholder={f.placeholder}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-all text-sm text-gray-800 placeholder:text-gray-300"
                    value={item[f.key] || ""}
                    onChange={(e) => updateItem(item.id, f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">{t("form.description")}</label>
              <textarea
                rows="3"
                placeholder="Relevant coursework or honors..."
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-all text-sm text-gray-800 placeholder:text-gray-300 resize-none leading-relaxed"
                value={item.description || ""}
                onChange={(e) => updateItem(item.id, "description", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EducationForm;