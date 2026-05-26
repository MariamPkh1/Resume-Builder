from django.test import SimpleTestCase

from apps.ai.ats_cv import (
    build_ats_job_description,
    collect_ats_facts,
    filter_ats_false_positives,
    build_ats_cv_snapshot,
)


class MockCV:
    def __init__(self, title="CV", language="ka", template="classic", cv_data=None, section_order=None):
        self.title = title
        self.language = language
        self.template = template
        self.cv_data = cv_data or {}
        self.section_order = section_order or []


class ATS_CV_NormalizationTests(SimpleTestCase):
    def test_snapshot_omits_photo_and_normalizes_dates(self):
        cv = MockCV(
            cv_data={
                "personal_info": {
                    "full_name": "Test User",
                    "photo": "data:image/png;base64," + ("A" * 5000),
                },
                "sections": [
                    {
                        "type": "summary",
                        "title": "პროფესიული შეჯამება",
                        "content": "Experienced developer.",
                    },
                    {
                        "type": "experience",
                        "title": "Work Experience",
                        "items": [
                            {
                                "position": "Dev",
                                "company": "Acme",
                                "start": "2020-01",
                                "current": True,
                                "description": "Built apps.",
                            }
                        ],
                    },
                ],
            }
        )
        snap = build_ats_cv_snapshot(cv)
        self.assertNotIn("photo", snap["personal_info"])
        self.assertTrue(snap["personal_info"].get("has_profile_photo"))
        summary = next(s for s in snap["sections"] if s["type"] == "summary")
        self.assertEqual(summary["content"], "Experienced developer.")
        exp = next(s for s in snap["sections"] if s["type"] == "experience")
        self.assertEqual(exp["items"][0]["start"], "2020-01")
        self.assertEqual(exp["items"][0]["end"], "Present")

    def test_facts_detect_filled_summary_and_dated_experience(self):
        snap = {
            "sections": [
                {"type": "summary", "content": "Hello"},
                {
                    "type": "experience",
                    "items": [{"start": "2020", "end": "Present", "current": True}],
                },
            ]
        }
        facts = collect_ats_facts(snap)
        self.assertTrue(facts["has_summary"])
        self.assertTrue(facts["all_experience_dated"])

    def test_filter_removes_false_empty_summary_issue(self):
        facts = {"has_summary": True, "all_experience_dated": False}
        result = {
            "ats_score": 70,
            "issues": [
                "პროფესიული შეჯამება სექცია ცარიელია.",
                "არასაკმარისი გამოცდილება.",
            ],
            "keyword_gaps": [],
            "format_recommendations": [],
            "section_recommendations": [],
        }
        filtered = filter_ats_false_positives(result, facts)
        self.assertEqual(len(filtered["issues"]), 1)
        self.assertIn("გამოცდილება", filtered["issues"][0])

    def test_filter_removes_false_missing_dates_issue(self):
        facts = {"has_summary": True, "all_experience_dated": True}
        result = {
            "ats_score": 70,
            "issues": [
                "სამუშაო გამოცდილების სექციაში არ არის დასაწყისი და დასრულების თარიღები.",
            ],
            "keyword_gaps": [],
            "format_recommendations": [],
            "section_recommendations": [],
        }
        filtered = filter_ats_false_positives(result, facts)
        self.assertEqual(filtered["issues"], [])

    def test_build_job_description_from_target_role(self):
        jd = build_ats_job_description(
            job_description="General CV review",
            target_role="Frontend Developer",
            industry="Technology",
        )
        self.assertIn("Frontend Developer", jd)
        self.assertIn("Technology", jd)
        self.assertNotIn("General CV review", jd)
