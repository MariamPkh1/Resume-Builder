/**
 * Standard section headings for live preview / PDF (follows UI language, not stored section.title).
 */
export function getResumeSectionTitle(section, t) {
  switch (section?.type) {
    case "summary":
      return t("resume.professionalSummary");
    case "experience":
      return t("resume.workExperience");
    case "education":
      return t("resume.education");
    case "skills":
      return t("resume.skills");
    case "projects":
      return t("resume.projects");
    case "languages":
      return t("resume.languages");
    case "certificates":
      return t("resume.certificates");
    default:
      return section?.title?.trim() || section?.type || "";
  }
}
