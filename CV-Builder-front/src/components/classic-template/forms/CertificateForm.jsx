import React from "react";
import { Award, Trash2, Plus, X, GripVertical } from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";

const CertificateForm = ({ section, setResumeData, dragHandleProps, onDeleteSection }) => {
  const { t } = useLanguage();

  const addEntry = () => {
    const newItem = { id: Date.now(), name: "", issuer: "", startDate: "", endDate: "" };
    setResumeData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === section.id ? { ...s, items: [...(s.items || []), newItem] } : s
      ),
    }));
  };

  const deleteEntry = (itemId) => {
    setResumeData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === section.id ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s
      ),
    }));
  };

  const updateItem = (itemId, field, value) => {
    setResumeData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== section.id) return s;
        return {
          ...s,
          items: s.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
        };
      }),
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
          <Award size={15} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-700">{section.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDeleteSection}
            className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
          >
            <X size={14} />
          </button>
          <button
            type="button"
            onClick={addEntry}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <Plus size={12} /> {t("form.addCertificate")}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {section.items?.map((item) => (
          <div
            key={item.id}
            className="group relative grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 transition-all"
          >
            <button
              type="button"
              onClick={() => deleteEntry(item.id)}
              className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
            >
              <Trash2 size={13} />
            </button>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">
                {t("form.certificateName")}
              </label>
              <input
                placeholder={t("placeholder.certificateName")}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-all text-sm text-gray-800 placeholder:text-gray-300"
                value={item.name || ""}
                onChange={(e) => updateItem(item.id, "name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">
                {t("form.issuer")}
              </label>
              <input
                placeholder={t("placeholder.issuer")}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-all text-sm text-gray-800 placeholder:text-gray-300"
                value={item.issuer || ""}
                onChange={(e) => updateItem(item.id, "issuer", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">
                {t("form.startDate")}
              </label>
              <input
                type="month"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-all text-sm text-gray-700"
                value={item.startDate || item.start || ""}
                onChange={(e) => updateItem(item.id, "startDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">
                {t("form.endDate")}
              </label>
              <input
                type="month"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-all text-sm text-gray-700"
                value={item.endDate || item.end || item.date || ""}
                onChange={(e) => updateItem(item.id, "endDate", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CertificateForm;
