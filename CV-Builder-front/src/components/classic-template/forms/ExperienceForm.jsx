import React from "react";
import { Briefcase, Trash2, X, Plus, GripVertical } from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";

const ExperienceForm = ({ section, setResumeData, cvId, dragHandleProps, onDeleteSection }) => {
  const { t } = useLanguage();

  const updateItem = (itemId, field, value) => {
    setResumeData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== section.id) return s;
        return {
          ...s,
          items: s.items.map((item) => {
            if (item.id !== itemId) return item;
            const updatedItem = { ...item, [field]: value };
            if (field === "position") updatedItem.title = value;
            if (field === "title") updatedItem.position = value;
            return updatedItem;
          }),
        };
      }),
    }));
  };

  const addEntry = () => {
    const newItem = { id: Date.now(), company: "", position: "", title: "", start: "", end: "", current: false, description: "", location: "" };
    setResumeData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === section.id ? { ...s, items: [...(s.items || []), newItem] } : s)),
    }));
  };

  const removeItem = (itemId) => {
    setResumeData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === section.id ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s)),
    }));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div
          {...dragHandleProps}
          className="flex items-center gap-2 cursor-grab"
        >
          <GripVertical size={14} className="text-gray-300" />
          <Briefcase size={15} className="text-gray-400" />
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
            <Plus size={12} /> {t("form.addEntry")}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {section.items?.map((item) => (
          <div key={item.id} className="group relative p-5 bg-gray-50 border border-gray-100 rounded-xl space-y-4 hover:border-gray-200 transition-all">
            <button
              onClick={() => removeItem(item.id)}
              className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t("form.company"), key: "company", placeholder: t("placeholder.company") },
                { label: t("form.jobTitle"), key: "position", placeholder: t("placeholder.jobTitle"), value: item.position || item.title || "" },
              ].map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">{f.label}</label>
                  <input
                    placeholder={f.placeholder}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-all text-sm text-gray-800 placeholder:text-gray-300"
                    value={f.value !== undefined ? f.value : (item[f.key] || "")}
                    onChange={(e) => updateItem(item.id, f.key, e.target.value)}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">{t("form.startDate")}</label>
                <input
                  type="month"
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-all text-sm text-gray-700"
                  value={item.start || ""}
                  onChange={(e) => updateItem(item.id, "start", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">{t("form.endDate")}</label>
                <input
                  type="month"
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-all text-sm text-gray-700 disabled:opacity-30 disabled:bg-gray-50"
                  disabled={item.current}
                  value={item.current ? "" : (item.end || "")}
                  onChange={(e) => updateItem(item.id, "end", e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer w-fit ml-1">
              <input
                type="checkbox"
                className="accent-gray-700"
                checked={item.current || false}
                onChange={(e) => updateItem(item.id, "current", e.target.checked)}
              />
              {t("form.currentlyWorking")}
            </label>

            <textarea
              placeholder={t("placeholder.experienceDescription")}
              className="w-full p-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-all text-sm text-gray-800 placeholder:text-gray-300 resize-none h-28 leading-relaxed"
              value={item.description || ""}
              onChange={(e) => updateItem(item.id, "description", e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExperienceForm;