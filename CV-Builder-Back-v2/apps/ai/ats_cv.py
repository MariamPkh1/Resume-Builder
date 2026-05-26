"""
Normalize CV JSON for ATS analysis, trim payload size, and filter false-positive issues.
"""
from __future__ import annotations

import re
from typing import Any

# Max characters per long text field in the ATS snapshot (keeps prompts small).
_MAX_TEXT_LEN = 800
_MAX_DESCRIPTION_LEN = 500

# Keys stripped from cv_data before sending to the model.
_INTERNAL_CV_KEYS = frozenset({"_ats_last_check"})

# Personal-info fields never sent to ATS (e.g. base64 photos blow up token count).
_OMIT_PERSONAL_KEYS = frozenset({"photo", "photoShape", "photo_shape"})


def _str(val: Any, max_len: int | None = None) -> str:
    if val is None:
        return ""
    s = str(val).strip()
    if max_len and len(s) > max_len:
        return s[: max_len - 1] + "…"
    return s


def _date_field(item: dict, *keys: str) -> str:
    for key in keys:
        val = item.get(key)
        if val is not None and str(val).strip():
            return _str(val)
    return ""


def _normalize_experience_item(item: dict) -> dict:
    start = _date_field(item, "start", "startDate", "start_date")
    current = bool(item.get("current"))
    end = _date_field(item, "end", "endDate", "end_date")
    if current and not end:
        end_display = "Present"
    else:
        end_display = end

    return {
        "title": _str(item.get("position") or item.get("title")),
        "company": _str(item.get("company")),
        "location": _str(item.get("location")),
        "start": start,
        "end": end_display,
        "current": current,
        "description": _str(item.get("description"), _MAX_DESCRIPTION_LEN),
    }


def _normalize_education_item(item: dict) -> dict:
    return {
        "school": _str(item.get("school")),
        "degree": _str(item.get("degree")),
        "field": _str(item.get("field")),
        "location": _str(item.get("city") or item.get("country")),
        "start": _date_field(item, "start", "startDate", "start_date"),
        "end": _date_field(item, "end", "endDate", "end_date"),
        "description": _str(item.get("description"), _MAX_DESCRIPTION_LEN),
    }


def _normalize_project_item(item: dict) -> dict:
    return {
        "name": _str(item.get("name") or item.get("title")),
        "link": _str(item.get("link") or item.get("url")),
        "date": _str(item.get("date")),
        "description": _str(item.get("description"), _MAX_DESCRIPTION_LEN),
    }


def _normalize_skill_item(item: dict) -> str:
    return _str(item.get("name") or item.get("skill") or item)


def _normalize_language_item(item: dict) -> dict:
    return {
        "language": _str(item.get("language") or item.get("name")),
        "level": _str(item.get("level") or item.get("proficiency")),
    }


def _normalize_certificate_item(item: dict) -> dict:
    return {
        "name": _str(item.get("name") or item.get("title")),
        "issuer": _str(item.get("issuer")),
        "date": _date_field(item, "date", "startDate", "start", "endDate", "end"),
    }


def _normalize_section(section: dict) -> dict | None:
    if not isinstance(section, dict):
        return None

    sec_type = _str(section.get("type")).lower() or "custom"
    title = _str(section.get("title")) or sec_type
    base: dict[str, Any] = {"type": sec_type, "title": title}

    if sec_type == "summary":
        content = _str(section.get("content") or section.get("description"), _MAX_TEXT_LEN)
        if not content and isinstance(section.get("items"), list):
            parts = [
                _str(it.get("content") or it.get("description"))
                for it in section["items"]
                if isinstance(it, dict)
            ]
            content = "\n".join(p for p in parts if p)[:_MAX_TEXT_LEN]
        base["content"] = content
        return base

    items = section.get("items")
    if not isinstance(items, list):
        items = []

    if sec_type == "experience":
        base["items"] = [_normalize_experience_item(it) for it in items if isinstance(it, dict)]
    elif sec_type == "education":
        base["items"] = [_normalize_education_item(it) for it in items if isinstance(it, dict)]
    elif sec_type == "projects":
        base["items"] = [_normalize_project_item(it) for it in items if isinstance(it, dict)]
    elif sec_type == "skills":
        names = []
        for it in items:
            if isinstance(it, dict):
                name = _normalize_skill_item(it)
                if name:
                    names.append(name)
            elif isinstance(it, str) and it.strip():
                names.append(it.strip())
        base["skills"] = names
    elif sec_type == "languages":
        base["items"] = [_normalize_language_item(it) for it in items if isinstance(it, dict)]
    elif sec_type == "certificates":
        base["items"] = [_normalize_certificate_item(it) for it in items if isinstance(it, dict)]
    else:
        base["items"] = items[:20]

    return base


def _normalize_personal_info(raw: dict | None) -> dict:
    if not isinstance(raw, dict):
        return {}
    out = {}
    for key, val in raw.items():
        if key in _OMIT_PERSONAL_KEYS:
            if val:
                out["has_profile_photo"] = True
            continue
        if key in ("fullName", "full_name"):
            out["full_name"] = _str(val)
        elif key in ("jobTitle", "job_title"):
            out["job_title"] = _str(val)
        elif key == "linkedin":
            out["linkedin"] = _str(val)
        elif key in ("email", "phone", "location", "website"):
            out[key] = _str(val)
        else:
            out[key] = _str(val, 200)
    return out


def build_ats_cv_snapshot(cv) -> dict:
    """
    Compact, schema-stable CV document for ATS prompts.
    Omits photos/base64 and internal metadata keys.
    """
    raw = cv.cv_data if isinstance(cv.cv_data, dict) else {}
    cleaned = {k: v for k, v in raw.items() if k not in _INTERNAL_CV_KEYS}

    personal = _normalize_personal_info(
        cleaned.get("personal_info") or cleaned.get("personalInfo")
    )

    sections_raw = cleaned.get("sections")
    if not isinstance(sections_raw, list):
        sections_raw = []

    sections = []
    for sec in sections_raw:
        normalized = _normalize_section(sec)
        if normalized:
            sections.append(normalized)

    order = cv.section_order if isinstance(cv.section_order, list) else []
    order_ids = [str(x) for x in order]

    return {
        "title": _str(getattr(cv, "title", "")),
        "language": _str(getattr(cv, "language", "")),
        "template": _str(getattr(cv, "template", "")),
        "personal_info": personal,
        "sections": sections,
        "section_order": order_ids,
    }


def collect_ats_facts(snapshot: dict) -> dict:
    """Ground-truth flags used to filter false-positive model issues."""
    summary_text = ""
    experience = []
    skill_names: list[str] = []
    has_skills = False

    for sec in snapshot.get("sections") or []:
        if not isinstance(sec, dict):
            continue
        st = (sec.get("type") or "").lower()
        if st == "summary":
            summary_text = _str(sec.get("content"))
        elif st == "experience":
            experience = list(sec.get("items") or [])
        elif st == "skills":
            has_skills = bool(sec.get("skills"))
            skill_names = list(sec.get("skills") or [])

    exp_dated = []
    for item in experience:
        if not isinstance(item, dict):
            continue
        start = _str(item.get("start"))
        end = _str(item.get("end"))
        current = bool(item.get("current"))
        exp_dated.append(
            {
                "has_start": bool(start),
                "has_end_or_current": bool(end) or current,
                "start": start,
                "end": end,
                "current": current,
            }
        )

    all_experience_dated = (
        len(exp_dated) > 0 and all(e["has_start"] and e["has_end_or_current"] for e in exp_dated)
    )

    return {
        "has_summary": bool(summary_text),
        "summary_length": len(summary_text),
        "experience_count": len(experience),
        "all_experience_dated": all_experience_dated,
        "experience": exp_dated,
        "has_skills_section": has_skills,
        "skill_count": len(skill_names),
        "skills": skill_names[:50],
    }


def build_ats_job_description(
    *,
    job_description: str = "",
    target_role: str = "",
    industry: str = "",
) -> str:
    jd = (job_description or "").strip()
    role = (target_role or "").strip()
    ind = (industry or "").strip()

    if jd and jd.lower() not in ("general cv review", "general cv review."):
        return jd

    parts = []
    if role:
        parts.append(f"Target role: {role}")
    if ind:
        parts.append(f"Industry: {ind}")
    if parts:
        parts.append(
            "Evaluate the CV primarily for ATS fit and keyword alignment with this role."
        )
        return "\n".join(parts)

    return (
        "No specific target role was provided. Review ATS structure, clarity, "
        "section naming, and general completeness. Do not assume a specific job title."
    )


# ─── False-positive filters (bilingual heuristics) ─────────────────────────────

_EMPTY_SUMMARY_RE = re.compile(
    r"(empty|missing|no|lack|without|absent|ცარიელ|არ\s+არის|არ\s+გაქვ|არ\s+გაქვთ|"
    r"დაკლებ|აკლი|გამოტოვ|missing).{0,40}"
    r"(summary|შეჯამებ|profile\s+summary|professional\s+summary|პროფესიულ)",
    re.IGNORECASE | re.UNICODE,
)

_SUMMARY_SECTION_EMPTY_RE = re.compile(
    r"(შეჯამებ|summary).{0,30}(ცარიელ|empty|missing|არ\s+არის)",
    re.IGNORECASE | re.UNICODE,
)

_MISSING_EXP_DATES_RE = re.compile(
    r"(date|თარიღ|დრო|period|პერიოდ).{0,50}"
    r"(missing|lack|no|not|without|არ\s+არის|აკლი|დაკლებ|მითითებულ)",
    re.IGNORECASE | re.UNICODE,
)

_EXP_DATES_CONTEXT_RE = re.compile(
    r"(experience|გამოცდილებ|work|სამუშაო|employment|დასაქმ)",
    re.IGNORECASE | re.UNICODE,
)


def _issue_claims_empty_summary(text: str) -> bool:
    t = text or ""
    return bool(_SUMMARY_SECTION_EMPTY_RE.search(t) or _EMPTY_SUMMARY_RE.search(t))


def _issue_claims_missing_experience_dates(text: str) -> bool:
    t = text or ""
    if not _MISSING_EXP_DATES_RE.search(t):
        return False
    return bool(_EXP_DATES_CONTEXT_RE.search(t))


def filter_ats_false_positives(result: dict, facts: dict) -> dict:
    """Remove issues contradicted by normalized CV facts."""
    if not isinstance(result, dict):
        return result

    out = dict(result)
    issues = out.get("issues")
    if not isinstance(issues, list):
        return out

    filtered = []
    for issue in issues:
        text = issue if isinstance(issue, str) else str(issue.get("issue") or issue)
        if facts.get("has_summary") and _issue_claims_empty_summary(text):
            continue
        if facts.get("all_experience_dated") and _issue_claims_missing_experience_dates(text):
            continue
        filtered.append(issue)

    out["issues"] = filtered

    section_recs = out.get("section_recommendations")
    if isinstance(section_recs, list) and facts.get("has_summary"):
        out["section_recommendations"] = [
            r
            for r in section_recs
            if not _issue_claims_empty_summary(str(r))
        ]

    return out
