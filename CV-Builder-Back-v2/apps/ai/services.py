import json
from django.conf import settings
from openai import OpenAI

from .ats_cv import (
    build_ats_cv_snapshot,
    build_ats_job_description,
    collect_ats_facts,
    filter_ats_false_positives,
)


def _safe_json_loads(text: str):
    try:
        return json.loads(text)
    except Exception:
        return None

def _normalize_target_language(language_code: str | None, target_language: str | None = None):
    code = (language_code or "").strip().lower()
    if code == "ka":
        return "ka", "Georgian"
    # fallback for missing/blank/invalid
    if target_language and target_language.strip():
        return "en", "English"
    return "en", "English"


def _looks_mostly_latin(text: str) -> bool:
    """Heuristic: detect English/Latin-heavy strings."""
    if not text:
        return False
    letters = [ch for ch in text if ch.isalpha()]
    if not letters:
        return False
    latin = [ch for ch in letters if ("a" <= ch.lower() <= "z")]
    return (len(latin) / len(letters)) >= 0.7


def _rewrite_priority_actions_language(
    priority_actions: list[str], *, target_language: str, client: OpenAI, model: str
) -> list[str]:
    """Rewrite recommendation bullets into the target language."""
    prompt = f"""
Rewrite these CV recommendation bullet points into {target_language}.
Keep the exact meaning, keep them concise, and return STRICT JSON only:
{{
  "priority_actions": ["...", "..."]
}}

input:
{json.dumps(priority_actions, ensure_ascii=False)}
""".strip()

    response = client.responses.create(
        model=model,
        input=prompt,
        temperature=0.1,
        max_output_tokens=350,
    )
    parsed = _safe_json_loads(getattr(response, "output_text", "") or "")
    if not isinstance(parsed, dict):
        return priority_actions
    items = parsed.get("priority_actions")
    if not isinstance(items, list):
        return priority_actions
    cleaned = [str(x).strip() for x in items if str(x).strip()]
    return cleaned or priority_actions


def _generate_priority_actions(
    result: dict, *, target_language: str, client: OpenAI, model: str
) -> list[str]:
    """Generate concise, context-aware recommendations from tailor result."""
    payload = {
        "tailored_summary": result.get("tailored_summary", ""),
        "keyword_targets": result.get("keyword_targets", []),
        "section_suggestions": result.get("section_suggestions", {}),
    }
    prompt = f"""
Create 2-4 concise CV tailoring recommendation bullets in {target_language}.
Use the provided tailoring result and keep them specific to this CV/job.
Return STRICT JSON only:
{{
  "priority_actions": ["...", "..."]
}}

tailor_result:
{json.dumps(payload, ensure_ascii=False)}
""".strip()

    response = client.responses.create(
        model=model,
        input=prompt,
        temperature=0.2,
        max_output_tokens=350,
    )
    parsed = _safe_json_loads(getattr(response, "output_text", "") or "")
    if not isinstance(parsed, dict):
        return []
    items = parsed.get("priority_actions")
    if not isinstance(items, list):
        return []
    return [str(x).strip() for x in items if str(x).strip()]


def _enforce_tailor_language(
    result: dict, language_code: str, *, client: OpenAI, model: str
) -> dict:
    """
    Best-effort guard so Georgian tailoring doesn't show English bullet points.
    Keeps original AI output when language looks correct.
    """
    if not isinstance(result, dict):
        return result

    if language_code != "ka":
        return result

    out = dict(result)
    priority_actions = out.get("priority_actions")
    if isinstance(priority_actions, list):
        normalized = [
            item if isinstance(item, str) else str(item)
            for item in priority_actions
            if str(item).strip()
        ]
        if any(_looks_mostly_latin(item) for item in normalized):
            rewritten = _rewrite_priority_actions_language(
                normalized,
                target_language="Georgian",
                client=client,
                model=model,
            )
            # Strict: keep only non-Latin-heavy items for Georgian mode.
            out["priority_actions"] = [x for x in rewritten if not _looks_mostly_latin(x)]
        else:
            out["priority_actions"] = normalized
    else:
        out["priority_actions"] = []

    # Always keep recommendations visible in Georgian mode.
    if language_code == "ka" and not out.get("priority_actions"):
        generated = _generate_priority_actions(
            out, target_language="Georgian", client=client, model=model
        )
        out["priority_actions"] = [x for x in generated if not _looks_mostly_latin(x)]

    return out


def analyze_cv_with_openai(
    cv,
    job_description: str = "",
    language_code: str = "en",
    target_language: str = "English",
) -> dict:
    """
    Returns:
    {
      "analysis": {...parsed JSON or fallback...},
      "meta": {...}
    }
    """
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    language_code, target_language = _normalize_target_language(language_code, target_language)

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")

    # Use compact normalized snapshot (no photo/base64, trimmed fields)
    # to avoid context window overflow on large CV JSON.
    cv_payload = build_ats_cv_snapshot(cv)
    trimmed_job_description = (job_description or "").strip()
    if len(trimmed_job_description) > 6000:
        trimmed_job_description = trimmed_job_description[:6000] + "…"

    prompt = f"""
You are an expert CV reviewer and ATS consultant.

Analyze the CV and return STRICT JSON only with this exact shape:
{{
  "overall_score": <integer 0-100>,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "ats_notes": ["...", "..."]
}}

Rules:
- Be practical and specific.
- Mention quantified impact where appropriate.
- Tailor advice to the target role if job_description is provided.
- Response values (all feedback text and bullet points) must be entirely in {target_language}.
- Keep JSON keys in English.
- If the target language is Georgian, use natural professional Georgian terminology suitable for CV/career guidance (not literal machine-style phrasing).
- Do not include markdown fences.
- Return valid JSON only.

job_description:
{trimmed_job_description}

cv:
{json.dumps(cv_payload, ensure_ascii=False)}
""".strip()

    response = client.responses.create(
        model=model,
        input=prompt,
        temperature=0.2,
        max_output_tokens=700,
    )

    raw_text = getattr(response, "output_text", "") or ""
    parsed = _safe_json_loads(raw_text)

    if parsed is None:
        parsed = {
            "overall_score": 70,
            "strengths": ["Response parsed as text fallback"],
            "improvements": ["Model returned non-JSON; review raw_text"],
            "ats_notes": [],
        }

    usage = getattr(response, "usage", None)
    prompt_tokens = getattr(usage, "input_tokens", 0) if usage else 0
    completion_tokens = getattr(usage, "output_tokens", 0) if usage else 0
    total_tokens = getattr(usage, "total_tokens", (prompt_tokens + completion_tokens)) if usage else (prompt_tokens + completion_tokens)

    return {
        "analysis": parsed,
        "meta": {
            "model_name": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "raw_text": raw_text,
        },
    }

def improve_section_with_openai(
    cv,
    section_name: str,
    section_content: str,
    job_description: str = "",
    language_code: str = "en",
    target_language: str = "English",
) -> dict:
    """
    Returns:
    {
      "result": {
        "improved_text": "...",
        "alternative_versions": ["...", "..."],
        "tips": ["...", "..."]
      },
      "meta": {...}
    }
    """
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    language_code, target_language = _normalize_target_language(language_code, target_language)

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")

    cv_context = {
        "title": cv.title,
        "language": cv.language,
        "template": cv.template,
        "section_order": cv.section_order,
    }

    prompt = f"""
You are an expert CV writer.

Task: Improve one CV section while preserving truthful meaning.
Return STRICT JSON only with this exact shape:
{{
  "improved_text": "<improved version of the section>",
  "alternative_versions": ["<alt 1>", "<alt 2>"],
  "tips": ["<tip 1>", "<tip 2>", "<tip 3>"]
}}

Rules:
- Do NOT invent facts.
- Make the writing clearer, more professional, and ATS-friendly.
- If the section is too short, improve what exists and explain what is missing in tips.
- Tailor to the target role if job_description is provided.
- The response values (improved_text, alternatives, tips) must be entirely in {target_language}.
- Keep JSON keys in English.
- If the target language is Georgian, use natural professional Georgian terminology suitable for CV writing.
- No markdown fences.
- Valid JSON only.

cv_context:
{json.dumps(cv_context, ensure_ascii=False)}

section_name:
{section_name}

section_content:
{section_content}

job_description:
{job_description}
""".strip()

    response = client.responses.create(
        model=model,
        input=prompt,
        temperature=0.3,
        max_output_tokens=900,
    )

    raw_text = getattr(response, "output_text", "") or ""
    parsed = _safe_json_loads(raw_text)

    if parsed is None:
        parsed = {
            "improved_text": section_content,
            "alternative_versions": [],
            "tips": ["Model returned non-JSON; inspect raw_text and retry."],
        }

    usage = getattr(response, "usage", None)
    prompt_tokens = getattr(usage, "input_tokens", 0) if usage else 0
    completion_tokens = getattr(usage, "output_tokens", 0) if usage else 0
    total_tokens = getattr(usage, "total_tokens", (prompt_tokens + completion_tokens)) if usage else (prompt_tokens + completion_tokens)

    return {
        "result": parsed,
        "meta": {
            "model_name": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "raw_text": raw_text,
        },
    }

def check_ats_with_openai(
    cv,
    job_description: str = "",
    target_role: str = "",
    industry: str = "",
    language_code: str = "en",
    target_language: str = "English",
) -> dict:
    """
    Returns:
    {
      "result": {
        "ats_score": <int 0-100>,
        "issues": ["...", "..."],
        "keyword_gaps": ["...", "..."],
        "format_recommendations": ["...", "..."],
        "section_recommendations": ["...", "..."]
      },
      "meta": {...}
    }
    """
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    language_code, target_language = _normalize_target_language(language_code, target_language)

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")

    snapshot = build_ats_cv_snapshot(cv)
    facts = collect_ats_facts(snapshot)
    job_context = build_ats_job_description(
        job_description=job_description,
        target_role=target_role,
        industry=industry,
    )

    prompt = f"""
You are an ATS (Applicant Tracking System) CV reviewer.

Analyze the CV for ATS-friendliness and return STRICT JSON only with this exact shape:
{{
  "ats_score": <integer 0-100>,
  "issues": ["...", "..."],
  "keyword_gaps": ["...", "..."],
  "format_recommendations": ["...", "..."],
  "section_recommendations": ["...", "..."]
}}

CV schema (normalized for this analysis):
- sections[].type: summary | experience | education | skills | projects | languages | certificates
- summary: sections where type is "summary" use "content" (plain text, may be non-empty)
- experience items: "title", "company", "start", "end" (end may be "Present" when current is true), "description"
- skills: sections where type is "skills" use "skills": ["name", ...]
- Do NOT report a section as empty if verified_facts or the CV data shows it has content.
- Do NOT report missing experience dates if an item has "start" and ("end" or current role with end "Present").

Rules:
- Be specific and practical.
- Focus on ATS parsing/readability, keywords, section naming, and missing content.
- Compare the CV against the job context below and identify keyword gaps when a target role is given.
- Do not invent facts. Only flag missing content that is actually absent in the CV JSON.
- The response values (all feedback and bullet points) must be entirely in {target_language}.
- Keep JSON keys in English.
- If the target language is Georgian, use natural professional Georgian terminology suitable for recruitment/CV analysis.
- Technical keywords (e.g., Django, PostgreSQL, REST API) may remain in their original form where appropriate.
- No markdown fences.
- Return valid JSON only.

verified_facts (computed from the CV — treat as ground truth):
{json.dumps(facts, ensure_ascii=False)}

job_context:
{job_context}

cv:
{json.dumps(snapshot, ensure_ascii=False)}
""".strip()

    response = client.responses.create(
        model=model,
        input=prompt,
        temperature=0.2,
        max_output_tokens=900,
    )

    raw_text = getattr(response, "output_text", "") or ""
    parsed = _safe_json_loads(raw_text)

    if parsed is None:
        parsed = {
            "ats_score": 60,
            "issues": ["Model returned non-JSON output."],
            "keyword_gaps": [],
            "format_recommendations": [],
            "section_recommendations": [],
        }
    else:
        parsed = filter_ats_false_positives(parsed, facts)

    usage = getattr(response, "usage", None)
    prompt_tokens = getattr(usage, "input_tokens", 0) if usage else 0
    completion_tokens = getattr(usage, "output_tokens", 0) if usage else 0
    total_tokens = getattr(usage, "total_tokens", (prompt_tokens + completion_tokens)) if usage else (prompt_tokens + completion_tokens)

    return {
        "result": parsed,
        "meta": {
            "model_name": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "raw_text": raw_text,
        },
    }

def tailor_for_job_with_openai(
    cv,
    job_description: str,
    focus_sections=None,
    language_code: str = "en",
    target_language: str = "English",
) -> dict:
    """
    Returns:
    {
      "result": {
        "tailored_summary": "...",
        "keyword_targets": ["...", "..."],
        "section_suggestions": {...},
        "priority_actions": ["...", "..."]
      },
      "meta": {...}
    }
    """
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    language_code, target_language = _normalize_target_language(language_code, target_language)
    focus_sections = focus_sections or []

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")

    cv_payload = {
        "title": cv.title,
        "language": cv.language,
        "template": cv.template,
        "cv_data": cv.cv_data,
        "section_order": cv.section_order,
    }

    prompt = f"""
You are an expert CV tailoring assistant.

Task: Tailor this CV for the target job description.
Return STRICT JSON only with this exact shape:
{{
  "tailored_summary": "<complete professional summary paragraph, ready to paste into the CV>",
  "keyword_targets": ["<keyword 1>", "<keyword 2>", "..."],
  "section_suggestions": {{
    "summary": ["<complete summary text if not using tailored_summary>"],
    "experience": ["<complete rewritten description for entry 1>", "<for entry 2>", "..."],
    "skills": ["<skill 1>", "<skill 2>", "..."]
  }},
  "priority_actions": ["<brief reviewer note only — not section body text>", "..."]
}}

Rules:
- Do NOT invent experience, employers, degrees, or achievements.
- Every value in tailored_summary and section_suggestions must be FINAL CV text the user can paste as-is.
- NEVER return meta-instructions (e.g. "add more detail about X", "mention technology Y") — only the actual rewritten content.
- section_suggestions.experience: one array element per work-history entry, in the same order as in the CV.
- section_suggestions.skills: one array element per skill name (not sentences about skills).
- If CV content is missing, return an empty string for that slot and explain in priority_actions only.
- Prioritize ATS-relevant keywords from the job description naturally in the rewritten text.
- If focus_sections is provided, prioritize those sections.
- The response values (tailored_summary, keyword_targets, section_suggestions, and priority_actions) must be entirely in {target_language}.
- Keep JSON keys in English.
- If the target language is Georgian, use natural professional Georgian terminology suitable for CV tailoring.
- Technical keywords (e.g., Django, PostgreSQL, REST API) may remain in original form where appropriate.
- No markdown fences.
- Return valid JSON only.

focus_sections:
{json.dumps(focus_sections, ensure_ascii=False)}

job_description:
{job_description}

cv:
{json.dumps(cv_payload, ensure_ascii=False)}
""".strip()

    response = client.responses.create(
        model=model,
        input=prompt,
        temperature=0.3,
        max_output_tokens=2500,
    )

    raw_text = getattr(response, "output_text", "") or ""
    parsed = _safe_json_loads(raw_text)

    if parsed is None:
        parsed = {
            "tailored_summary": "",
            "keyword_targets": [],
            "section_suggestions": {},
            "priority_actions": ["Model returned non-JSON output; retry request."],
        }
    else:
        parsed = _enforce_tailor_language(
            parsed, language_code, client=client, model=model
        )

    usage = getattr(response, "usage", None)
    prompt_tokens = getattr(usage, "input_tokens", 0) if usage else 0
    completion_tokens = getattr(usage, "output_tokens", 0) if usage else 0
    total_tokens = getattr(usage, "total_tokens", (prompt_tokens + completion_tokens)) if usage else (prompt_tokens + completion_tokens)

    return {
        "result": parsed,
        "meta": {
            "model_name": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "raw_text": raw_text,
        },
    }

def translate_cv_with_openai(cv, target_language: str, source_language: str | None = None) -> dict:
    """
    Returns:
    {
      "result": {
         "target_language": "en|ka",
         "translated_cv_data": {...},
         "notes": ["...", "..."]
      },
      "meta": {...}
    }
    """
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")

    cv_payload = {
        "title": cv.title,
        "language": cv.language,
        "template": cv.template,
        "cv_data": cv.cv_data,
        "section_order": cv.section_order,
    }

    prompt = f"""
You are a professional CV translator.

Task: Translate the CV content into the target language while preserving meaning and structure.
Return STRICT JSON only with this exact shape:
{{
  "target_language": "<en|ka>",
  "translated_cv_data": <JSON object>,
  "notes": ["...", "..."]
}}

Rules:
- Translate text content naturally and professionally for a CV/resume context.
- Preserve JSON structure as much as possible.
- Do NOT invent facts.
- Keep dates/numbers unchanged unless translation requires formatting adaptation.
- If some content is already in target language, keep it as-is.
- Return valid JSON only (no markdown fences).

source_language: {source_language or "auto"}
target_language: {target_language}

cv:
{json.dumps(cv_payload, ensure_ascii=False)}
""".strip()

    response = client.responses.create(
        model=model,
        input=prompt,
        temperature=0.2,
        max_output_tokens=1800,
    )

    raw_text = getattr(response, "output_text", "") or ""
    parsed = _safe_json_loads(raw_text)

    if parsed is None:
        parsed = {
            "target_language": target_language,
            "translated_cv_data": cv.cv_data,
            "notes": ["Model returned non-JSON output; retry translation."],
        }

    usage = getattr(response, "usage", None)
    prompt_tokens = getattr(usage, "input_tokens", 0) if usage else 0
    completion_tokens = getattr(usage, "output_tokens", 0) if usage else 0
    total_tokens = getattr(usage, "total_tokens", (prompt_tokens + completion_tokens)) if usage else (prompt_tokens + completion_tokens)

    return {
        "result": parsed,
        "meta": {
            "model_name": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "raw_text": raw_text,
        },
    }

def generate_cover_letter_with_openai(cv, job_description: str, company_name: str = "", tone: str = "professional") -> dict:
    """
    Returns:
    {
      "result": {
        "cover_letter": "...",
        "subject_line": "...",
        "notes": ["...", "..."]
      },
      "meta": {...}
    }
    """
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")

    cv_payload = {
        "title": cv.title,
        "language": cv.language,
        "template": cv.template,
        "cv_data": cv.cv_data,
        "section_order": cv.section_order,
    }

    prompt = f"""
You are an expert career writing assistant.

Task: Generate a tailored cover letter based on the CV and job description.
Return STRICT JSON only with this exact shape:
{{
  "cover_letter": "<full cover letter text>",
  "subject_line": "<optional email subject line>",
  "notes": ["...", "..."]
}}

Rules:
- Do NOT invent achievements or experience not present in the CV.
- Use a {tone} tone.
- Keep it professional and job-specific.
- If CV lacks enough information, still draft a usable letter and mention missing details in notes.
- No markdown fences.
- Return valid JSON only.

company_name: {company_name or "N/A"}
job_description:
{job_description}

cv:
{json.dumps(cv_payload, ensure_ascii=False)}
""".strip()

    response = client.responses.create(
        model=model,
        input=prompt,
        temperature=0.3,
        max_output_tokens=1400,
    )

    raw_text = getattr(response, "output_text", "") or ""
    parsed = _safe_json_loads(raw_text)

    if parsed is None:
        parsed = {
            "cover_letter": "",
            "subject_line": "",
            "notes": ["Model returned non-JSON output; retry request."],
        }

    usage = getattr(response, "usage", None)
    prompt_tokens = getattr(usage, "input_tokens", 0) if usage else 0
    completion_tokens = getattr(usage, "output_tokens", 0) if usage else 0
    total_tokens = getattr(usage, "total_tokens", (prompt_tokens + completion_tokens)) if usage else (prompt_tokens + completion_tokens)

    return {
        "result": parsed,
        "meta": {
            "model_name": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "raw_text": raw_text,
        },
    }