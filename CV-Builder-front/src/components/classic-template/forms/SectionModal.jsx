import React from "react";
import { X, FileText, Briefcase, GraduationCap, Code, Globe, Award, Laptop, Plus } from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";

const SECTIONS = [
  { type: "summary", titleKey: "resume.professionalSummary", icon: FileText },
  { type: "experience", titleKey: "resume.workExperience", icon: Briefcase },
  { type: "education", titleKey: "resume.education", icon: GraduationCap },
  { type: "skills", titleKey: "resume.skills", icon: Code },
  { type: "projects", titleKey: "resume.projects", icon: Laptop },
  { type: "languages", titleKey: "resume.languages", icon: Globe },
  { type: "certificates", titleKey: "resume.certificates", icon: Award },
];

const SECTION_BLUEPRINTS = {
  experience: { position: "", company: "", location: "", startDate: "", endDate: "", description: "", current: false },
  education: { degree: "", school: "", location: "", startDate: "", endDate: "", description: "" },
  skills: { name: "", level: "Intermediate" },
  languages: { language: "", level: "B2" },
  projects: { name: "", link: "", date: "", description: "" },
  certificates: { title: "", issuer: "", date: "" },
  summary: { content: "" }
};

const SectionModal = ({ onAdd, onClose }) => {
  const { t } = useLanguage();

  const handleSelectSection = (section) => {
    const title = t(section.titleKey);
    const newSection = {
      id: `sec_${Date.now()}`,
      type: section.type,
      title,
      items: section.type === "summary" ? [] : [{ ...SECTION_BLUEPRINTS[section.type] }],
      content: section.type === "summary" ? "" : undefined
    };
    onAdd(newSection);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-[420px] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-800">{t("editor.addSection")}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3 space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.type}
                onClick={() => handleSelectSection(section)}
                className="group w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all text-left"
              >
                <div className="p-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-400 group-hover:bg-gray-900 group-hover:border-gray-900 group-hover:text-white transition-all">
                  <Icon size={15} />
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                  {t(section.titleKey)}
                </span>
                <Plus size={14} className="ml-auto text-gray-300 group-hover:text-gray-600 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SectionModal;