import React from 'react';
import { useLanguage } from "../../context/LanguageContext";

const EuropassPreview = ({ data }) => {
  const { t } = useLanguage();

  // Standardizing keys to match Django Serializer & fallback
  const personalInfo = data?.personalInfo || data?.personal_info || {};
  const sections = data?.sections || [];

  const getSectionTitle = (section) => {
    // 1. If user typed a custom title, use it
    if (section.title && section.title.trim() !== "") return section.title;
    
    // 2. Fallback to translated type names from your context
    switch (section.type) {
      case "summary": return t("resume.summary");
      case "experience": return t("resume.experience");
      case "education": return t("resume.education");
      case "skills": return t("resume.skills");
      case "projects": return t("resume.projects");
      case "languages": return t("resume.languages");
      case "certificates": return t("resume.certificates");
      default: return section.type;
    }
  };

  // Helper for "Present" date localization
  const getPresentText = () => {
    const val = t("form.currentlyWorking"); // Reusing your existing key
    return val === "form.currentlyWorking" ? "Present" : val; 
  };

  return (
    <div className="w-[210mm] min-h-[297mm] bg-white flex font-sans text-slate-800 leading-relaxed shadow-2xl">
      
{/* SIDEBAR */}
      <div className="w-[32%] bg-[#37474f] text-white p-8">
        {personalInfo?.photo && (
          /* FIX: Logic updated to check for 'rounded-full' and use ternary for Tailwind compiler safety */
          <div className={`w-full aspect-square overflow-hidden mb-8 border-4 border-white/10 shadow-lg transition-all duration-500 ease-in-out ${
            personalInfo.photoShape === 'rounded-full' ? 'rounded-full' : 'rounded-2xl'
          }`}>
            <img src={personalInfo.photo} className="w-full h-full object-cover" alt="Profile" />
          </div>
        )}
        
        <div className="space-y-8">
          <section>
            <h2 className="text-[10px] uppercase tracking-[2px] font-bold text-blue-300 mb-4 border-b border-blue-300/20 pb-1">
              {t("resume.personalInfo")}
            </h2>
            <div className="space-y-3 text-[11px] opacity-90">
              {personalInfo?.email && <p><strong>{t("form.email")}:</strong> {personalInfo.email}</p>}
              {personalInfo?.phone && <p><strong>{t("form.phone")}:</strong> {personalInfo.phone}</p>}
              {personalInfo?.location && <p><strong>{t("form.location")}:</strong> {personalInfo.location}</p>}
              {personalInfo?.linkedin && <p><strong>LinkedIn:</strong> {personalInfo.linkedin}</p>}
            </div>
          </section>

          {/* Sidebar Sections: Skills & Languages */}
          {sections.filter(s => s.type === 'skills' || s.type === 'languages').map(section => (
            <section key={section.id}>
              <h2 className="text-[10px] uppercase tracking-[2px] font-bold text-blue-300 mb-4 border-b border-blue-300/20 pb-1">
                {getSectionTitle(section)}
              </h2>
              <div className="flex flex-wrap gap-2">
                {section.items?.map((item, i) => (
                  <span key={i} className="bg-white/10 px-2 py-1 rounded text-[9px] border border-white/5">
                    {item.name || item.language} {item.level || item.proficiency ? `(${item.level || item.proficiency})` : ''}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-12 bg-white text-left">
        <header className="mb-12">
          <h1 className="text-4xl font-light text-slate-900 mb-2">
            {personalInfo?.fullName?.split(' ')[0] || ""}{" "}
            <span className="font-bold">
              {personalInfo?.fullName?.split(' ').slice(1).join(' ') || ""}
            </span>
          </h1>
          <p className="text-xl text-blue-600 font-medium">
            {personalInfo?.jobTitle || ""}
          </p>
        </header>

        <div className="space-y-10">
          {/* Main Body Sections: Summary, Experience, Education, Projects, Certs */}
          {sections.filter(s => s.type !== 'skills' && s.type !== 'languages').map(section => (
            <section key={section.id}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[3px] mb-6 flex items-center gap-4">
                {getSectionTitle(section)}
                <div className="flex-1 h-[1px] bg-slate-100"></div>
              </h3>
              
              {section.type === 'summary' && (
                <p className="text-[12px] text-slate-600 italic whitespace-pre-line mb-4">
                  {section.content || section.description}
                </p>
              )}

              <div className="space-y-6">
                {section.items?.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-bold text-slate-800 text-[14px]">
                        {item.position || item.degree || item.name || item.title}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                        {item.startDate || item.start} — {item.current ? getPresentText() : (item.endDate || item.end || item.date)}
                      </span>
                    </div>
                    <p className="text-blue-600 text-[12px] font-semibold mb-2">
                      {item.company || item.school || item.issuer || item.organization}
                    </p>
                    <p className="text-[11px] text-slate-500 whitespace-pre-line">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EuropassPreview;