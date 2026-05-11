import React, { useRef } from "react";
import { User, Mail, Phone, MapPin, Linkedin, Briefcase, Camera, X, Circle, Square } from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";

const MAX_PHOTO_SIZE_MB = 5;
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

const PersonalInfoForm = ({ data = {}, update, showPhoto = false }) => {
  const fileInputRef = useRef(null);
  const { t } = useLanguage();
  const personalData = data || {};
  const currentShape = personalData.photoShape || "rounded-xl";

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= MAX_PHOTO_SIZE_BYTES) {
      const reader = new FileReader();
      reader.onloadend = () => update("photo", reader.result);
      reader.readAsDataURL(file);
    } else if (file) {
      alert(`Image must be under ${MAX_PHOTO_SIZE_MB}MB`);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
        <User size={15} className="text-gray-400" />
        <h2 className="text-sm font-bold text-gray-700">{t("resume.personalInfo")}</h2>
      </div>

      {showPhoto && (
        <div className="mb-6 flex items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="relative group shrink-0">
            <div className={`w-20 h-20 bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden transition-all duration-500 ${currentShape === "rounded-full" ? "rounded-full" : "rounded-xl"}`}>
              {personalData.photo ? <img src={personalData.photo} alt="P" className="w-full h-full object-cover" /> : <Camera size={24} className="text-gray-300" />}
            </div>
            {personalData.photo && (
              <button onClick={() => update("photo", "")} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-all z-10"><X size={10} /></button>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex gap-2">
              <button onClick={() => update("photoShape", "rounded-xl")} className={`p-1.5 rounded-lg border transition-all ${currentShape !== "rounded-full" ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-200 text-gray-400"}`}><Square size={14} /></button>
              <button onClick={() => update("photoShape", "rounded-full")} className={`p-1.5 rounded-lg border transition-all ${currentShape === "rounded-full" ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-200 text-gray-400"}`}><Circle size={14} /></button>
            </div>
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoChange} className="text-[10px] text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-600 cursor-pointer" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: t("form.fullName"), icon: User, key: "fullName", full: true },
          { label: t("form.jobTitle"), icon: Briefcase, key: "jobTitle", full: true },
          { label: t("form.email"), icon: Mail, key: "email" },
          { label: t("form.phone"), icon: Phone, key: "phone" },
          { label: t("form.location"), icon: MapPin, key: "location" },
          { label: t("form.linkedin"), icon: Linkedin, key: "linkedin" }
        ].map((f) => (
          <div key={f.key} className={`${f.full ? "md:col-span-2" : ""} space-y-1.5`}>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">{f.label}</label>
            <div className="relative group">
              <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-600 transition-colors" size={14} />
              <input
                className="w-full p-2.5 pl-9 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:bg-white transition-all text-sm text-gray-800 placeholder:text-gray-300"
                value={personalData[f.key] || ""}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.label}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalInfoForm;