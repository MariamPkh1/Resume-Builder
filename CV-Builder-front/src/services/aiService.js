/**
 * aiService.js
 *
 * All AI-related API calls for Nebula CV Builder.
 * Lives in services/ alongside api.js — imports the same axios instance
 * so auth token, UTF-8 headers, and interceptors are all inherited automatically.
 *
 * Endpoints match the spec exactly:
 *   POST /ai/improve-section/
 *   POST /ai/check-ats/
 *   POST /ai/tailor-for-job/
 *   POST /ai/analyze-cv/
 *
 * Every function returns { data, error } — components never need try/catch.
 * Error object is normalized: { detail, quota, upgrade_required }.
 * 403 quota errors: upgrade_required === true; use detail + quota for UI messaging.
 *
 * Language support:
 *   All functions accept a top-level `language` param ("en" | "ka").
 *   This is forwarded as the `language` field in every POST body so the backend
 *   LLM prompt instructs the model to respond in the correct language.
 *   Omitting `language` (or passing undefined / "") defaults to "en" on the backend.
 */

import api from "./api";

const normalizeError = (err) => {
  const body = err.response?.data ?? {};
  const status = err.response?.status;
  const detail =
    typeof body?.detail === "string"
      ? body.detail
      : (body?.error ?? body?.detail ?? "Something went wrong. Please try again.");
  const quota = body?.quota ?? null;
  const upgrade_required = status === 403 || !!body?.upgrade_required;
  return { detail, quota, upgrade_required, error: detail, ...body };
};

// ─── 1. Improve a single section ─────────────────────────────────────────────
// Serializer: { cv_id, section_name, section_content, job_description, language }
//
// `language` is accepted BOTH as a top-level param AND (for backward compat)
// inside the `context` object. Top-level takes priority.
export const improveSectionAPI = async ({
  cvId,
  sectionType,
  sectionName,
  content,
  sectionContent,
  jobDescription,
  language,          // ← top-level, preferred
  context = {},
}) => {
  try {
    const body = {
      cv_id:           cvId,
      section_name:    sectionName ?? sectionType,
      section_content: sectionContent ?? content ?? "",
      job_description: jobDescription ?? context?.job_description ?? context?.job_title ?? "",
      // Top-level `language` wins; fall back to context.language; default "en"
      language:        language ?? context?.language ?? "en",
    };
    const { data } = await api.post("/api/ai/improve-section/", body);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: normalizeError(err) };
  }
};

// ─── 2. ATS compatibility check ──────────────────────────────────────────────
// Serializer: { cv_id, job_description, language }
// Accepts jobDescription OR (targetRole, industry); builds job_description.
export const checkATSAPI = async ({
  cvId,
  jobDescription,
  industry    = "",
  targetRole  = "",
  language    = "en",
}) => {
  try {
    const jd =
      jobDescription ??
      [
        targetRole && `Target role: ${targetRole}`,
        industry   && `Industry: ${industry}`,
      ]
        .filter(Boolean)
        .join("\n");

    const { data } = await api.post("/api/ai/check-ats/", {
      cv_id:           cvId,
      job_description: jd || "General CV review",
      language,
    });
    return { data, error: null };
  } catch (err) {
    return { data: null, error: normalizeError(err) };
  }
};

// ─── 3. Tailor CV for a specific job ─────────────────────────────────────────
// Serializer: { cv_id, job_description, focus_sections, language }
// Combines jobTitle, company into job_description; defaults focus_sections.
export const tailorForJobAPI = async ({
  cvId,
  jobTitle       = "",
  jobDescription,
  company        = "",
  focusSections,
  language       = "en",
}) => {
  try {
    const parts = [
      jobTitle       && `Role: ${jobTitle}`,
      company        && `Company: ${company}`,
      jobDescription,
    ].filter(Boolean);

    const jd = parts.join("\n\n");

    const { data } = await api.post("/api/ai/tailor-for-job/", {
      cv_id:           cvId,
      job_description: jd || "General tailoring",
      focus_sections:  focusSections ?? ["summary", "experience", "skills"],
      language,
    });
    return { data, error: null };
  } catch (err) {
    return { data: null, error: normalizeError(err) };
  }
};

// ─── 4. Full CV analysis ─────────────────────────────────────────────────────
// Serializer: { cv_id, job_description, language }
// Accepts jobDescription OR (targetRole, industry); builds job_description.
export const analyzeCVAPI = async ({
  cvId,
  jobDescription,
  targetRole = "",
  industry   = "",
  language   = "en",
}) => {
  try {
    const jd =
      jobDescription ??
      [
        targetRole && `Target role: ${targetRole}`,
        industry   && `Industry: ${industry}`,
      ]
        .filter(Boolean)
        .join("\n");

    const { data } = await api.post("/api/ai/analyze-cv/", {
      cv_id:           cvId,
      job_description: jd || "General CV analysis",
      language,
    });
    return { data, error: null };
  } catch (err) {
    return { data: null, error: normalizeError(err) };
  }
};