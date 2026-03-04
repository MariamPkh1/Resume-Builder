import React from "react";
import { 
  Mail, Phone, MapPin, Linkedin, Briefcase, 
  GraduationCap, Code, FolderCode, Languages, Award, FileText 
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

const LivePreview = ({ data, innerRef, zoom = 1 }) => {
  const { t } = useLanguage();

  const getSectionIcon = (type) => {
    switch (type) {
      case "experience": return <Briefcase size={12} />;
      case "education": return <GraduationCap size={12} />;
      case "skills": return <Code size={12} />;
      case "projects": return <FolderCode size={12} />;
      case "languages": return <Languages size={12} />;
      case "certificates": return <Award size={12} />;
      case "summary": return <FileText size={12} />;
      default: return null;
    }
  };

  const getSectionTitle = (section) => {
    // If user has typed a custom title, use it. Otherwise, use translation.
    if (section.title && section.title.trim() !== "") return section.title;
    
    // Fallback to translated type names using your language context keys
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

  if (!data) return null;

  // Prioritize personalInfo (Django match) but fallback to personal_info (Legacy)
  const info = data.personalInfo || data.personal_info || {};

  return (
    <div className="flex flex-col items-center py-7 w-full min-h-full overflow-auto">
      <div
        ref={innerRef}
        style={{ 
          transform: `scale(${zoom})`, 
          transformOrigin: "top center",
          transition: "transform 0.2s ease-out"
        }}
        className="w-[210mm] min-h-[297mm] bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] p-[20mm] text-gray-900 mb-10 text-left"
      >
        {/* HEADER */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold tracking-[0.2em] uppercase text-gray-900 mb-1">
            {info?.fullName || "YOUR NAME"}
          </h1>
          
          {info?.jobTitle && (
            <p className="font-medium tracking-[0.15em] text-sm uppercase mb-3 text-gray-600">
              {info.jobTitle}
            </p>
          )}

          <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-[10px] mt-2 text-gray-500 lowercase tracking-widest">
            {info?.email && <span className="flex items-center gap-1.5">{info.email}</span>}
            {info?.phone && <span className="flex items-center gap-1.5">{info.phone}</span>}
            {info?.location && <span className="flex items-center gap-1.5 uppercase">{info.location}</span>}
            {info?.linkedin && (
              <a
                href={info.linkedin.startsWith("http") ? info.linkedin : `https://${info.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-blue-600 hover:underline"
              >
                {info.linkedin}
              </a>
            )}
          </div>
        </div>
        
        <hr className="border-black mb-8" />

        <div className="space-y-8">
          {(data.sections || []).map((s) => (
            <div key={s.id}>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] border-b border-gray-100 pb-1 mb-3 flex items-center gap-2 text-gray-800">
                {getSectionIcon(s.type)}
                {getSectionTitle(s)}
              </h3>

              {/* SUMMARY */}
              {s.type === "summary" && (
                <p className="text-[11px] leading-relaxed whitespace-pre-wrap text-gray-700">
                  {s.content || s.description}
                </p>
              )}

              {/* EXPERIENCE */}
              {s.type === "experience" &&
                s.items?.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="flex justify-between font-bold text-[11px]">
                      <span>{item.title || item.position}</span>
                      <span className="text-gray-400 font-normal">
                        {item.startDate || item.start} — {item.current ? t("resume.present") : (item.endDate || item.end)}
                      </span>
                    </div>
                    <div className="text-[10px] italic text-gray-600 mb-1">
                      {item.company}
                    </div>
                    <p className="text-[10px] leading-relaxed text-gray-500 whitespace-pre-wrap">
                      {item.description}
                    </p>
                  </div>
                ))}

              {/* EDUCATION */}
              {s.type === "education" &&
  s.items?.map((item, idx) => (
    <div key={idx} className="mb-4">
      <div className="flex justify-between font-bold text-[11px]">
        <span>{item.school}</span>
        <span className="text-gray-400 font-normal">
          {item.startDate || item.start} — {item.endDate || item.end}
        </span>
      </div>
      <div className="text-[10px] italic text-gray-600 mb-1">
        {item.degree}
        {(item.city || item.country) && (
          <span className="ml-2 not-italic text-gray-400">
            · {[item.city, item.country].filter(Boolean).join(", ")}
          </span>
        )}
      </div>
      {item.description && (
        <p className="text-[10px] leading-relaxed text-gray-500 whitespace-pre-wrap">
          {item.description}
        </p>
      )}
    </div>
  ))}

              {/* SKILLS */}
              {s.type === "skills" && (
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {s.items?.map((item, idx) => (
                    <span key={idx} className="text-[10px] text-gray-700 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded">
                      {item.name} {item.level ? `(${item.level})` : ''}
                    </span>
                  ))}
                </div>
              )}

              {/* PROJECTS */}
              {s.type === "projects" &&
                s.items?.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-[11px]">{item.name || item.title}</span>
                      {item.link && (
                        <a 
                          href={item.link.startsWith("http") ? item.link : `https://${item.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-blue-600 hover:underline"
                        >
                          🔗
                        </a>
                      )}
                    </div>
                    <p className="text-[10px] leading-relaxed text-gray-500 whitespace-pre-wrap">
                      {item.description}
                    </p>
                  </div>
                ))}

              {/* LANGUAGES */}
              {s.type === "languages" &&
                s.items?.map((item, idx) => (
                  <div key={idx} className="mb-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-gray-800">{item.language || item.name}</span>
                      <span className="text-gray-500 italic">{item.proficiency || item.level}</span>
                    </div>
                  </div>
                ))}

              {/* CERTIFICATES */}
              {s.type === "certificates" &&
                s.items?.map((item, idx) => (
                  <div key={idx} className="mb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-bold text-[11px] text-gray-800">{item.name}</div>
                        <div className="text-[10px] italic text-gray-600">{item.issuer}</div>
                      </div>
                      <span className="text-[10px] text-gray-400">{item.date}</span>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LivePreview;