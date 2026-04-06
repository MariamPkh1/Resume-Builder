from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.ai.models import AIUsage
from apps.cvs.models import CV


User = get_user_model()


class AIAPITests(APITestCase):
    def create_user(self, **overrides):
        data = {
            "email": "aiuser@example.com",
            "password": "StrongPass123",
            "full_name": "AI User",
            "is_active": True,
            "email_verified": True,
        }
        data.update(overrides)
        return User.objects.create_user(**data)

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def create_cv(self, user, **overrides):
        data = {
            "user": user,
            "title": "AI Resume",
            "cv_data": {"personalInfo": {"fullName": "AI User"}},
            "section_order": ["personalInfo", "summary"],
            "language": "en",
            "template": "modern",
        }
        data.update(overrides)
        return CV.objects.create(**data)

    @patch("apps.ai.views.analyze_cv_with_openai")
    def test_analyze_cv_returns_mocked_result_and_logs_usage(self, mock_analyze):
        user = self.create_user()
        cv = self.create_cv(user)
        self.authenticate(user)
        mock_analyze.return_value = {
            "analysis": {
                "overall_score": 88,
                "strengths": ["Strong structure"],
                "improvements": ["Add metrics"],
                "ats_notes": ["Use more keywords"],
            },
            "meta": {
                "model_name": "test-model",
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30,
            },
        }

        response = self.client.post(
            "/api/ai/analyze-cv/",
            {"cv_id": str(cv.id), "language": "en", "job_description": "Backend engineer"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["analysis"]["overall_score"], 88)
        self.assertEqual(response.data["quota"]["used_after"], 1)
        usage = AIUsage.objects.get(user=user, feature=AIUsage.Feature.ANALYZE_CV)
        self.assertTrue(usage.success)
        self.assertEqual(usage.total_tokens, 30)

    def test_analyze_cv_enforces_free_quota(self):
        user = self.create_user()
        cv = self.create_cv(user)
        self.authenticate(user)
        for _ in range(5):
            AIUsage.objects.create(
                user=user,
                feature=AIUsage.Feature.ANALYZE_CV,
                success=True,
            )

        response = self.client.post(
            "/api/ai/analyze-cv/",
            {"cv_id": str(cv.id), "language": "en"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["quota"]["limit"], 5)
        denied = AIUsage.objects.filter(
            user=user,
            feature=AIUsage.Feature.ANALYZE_CV,
            success=False,
        ).latest("created_at")
        self.assertTrue(denied.request_payload["quota_denied"])

    @patch("apps.ai.views.improve_section_with_openai")
    def test_improve_section_returns_mocked_result(self, mock_improve):
        user = self.create_user()
        cv = self.create_cv(user)
        self.authenticate(user)
        mock_improve.return_value = {
            "result": {
                "improved_text": "Improved summary",
                "alternative_versions": ["Alt 1", "Alt 2"],
                "tips": ["Tip 1", "Tip 2"],
            },
            "meta": {
                "model_name": "test-model",
                "prompt_tokens": 11,
                "completion_tokens": 21,
                "total_tokens": 32,
            },
        }

        response = self.client.post(
            "/api/ai/improve-section/",
            {
                "cv_id": str(cv.id),
                "section_name": "summary",
                "section_content": "Old summary",
                "language": "en",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["improved_text"], "Improved summary")
        self.assertEqual(
            AIUsage.objects.filter(user=user, feature=AIUsage.Feature.IMPROVE_SECTION, success=True).count(),
            1,
        )

    @patch("apps.ai.views.check_ats_with_openai")
    def test_check_ats_updates_cv_data_with_last_score(self, mock_check_ats):
        user = self.create_user(subscription_tier="pro")
        cv = self.create_cv(user)
        self.authenticate(user)
        mock_check_ats.return_value = {
            "result": {
                "ats_score": 91,
                "issues": [],
                "keyword_gaps": [],
                "format_recommendations": [],
                "section_recommendations": [],
            },
            "meta": {
                "model_name": "test-model",
                "prompt_tokens": 12,
                "completion_tokens": 22,
                "total_tokens": 34,
            },
        }

        response = self.client.post(
            "/api/ai/check-ats/",
            {"cv_id": str(cv.id), "language": "en"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cv.refresh_from_db()
        self.assertEqual(cv.cv_data["_ats_last_check"]["score"], 91)

    def test_check_ats_is_blocked_for_free_users(self):
        user = self.create_user()
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.post(
            "/api/ai/check-ats/",
            {"cv_id": str(cv.id), "language": "en"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["quota"]["limit"], 0)

    @patch("apps.ai.views.tailor_for_job_with_openai")
    def test_tailor_for_job_returns_mocked_result_for_pro_user(self, mock_tailor):
        user = self.create_user(subscription_tier="pro")
        cv = self.create_cv(user)
        self.authenticate(user)
        mock_tailor.return_value = {
            "result": {
                "tailored_summary": "Tailored summary",
                "keyword_targets": ["Django", "REST API"],
                "section_suggestions": {"summary": ["Update intro"]},
                "priority_actions": ["Add metrics"],
            },
            "meta": {
                "model_name": "test-model",
                "prompt_tokens": 13,
                "completion_tokens": 23,
                "total_tokens": 36,
            },
        }

        response = self.client.post(
            "/api/ai/tailor-for-job/",
            {
                "cv_id": str(cv.id),
                "job_description": "Looking for a Django engineer",
                "language": "en",
                "focus_sections": ["summary"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["tailored_summary"], "Tailored summary")

    @patch("apps.ai.views.translate_cv_with_openai")
    def test_translate_cv_creates_translated_cv_for_pro_user(self, mock_translate):
        user = self.create_user(subscription_tier="pro")
        cv = self.create_cv(user, cv_data={"summary": "Hello"})
        self.authenticate(user)
        mock_translate.return_value = {
            "result": {
                "target_language": "ka",
                "translated_cv_data": {"summary": "გამარჯობა"},
                "notes": ["ok"],
            },
            "meta": {
                "model_name": "test-model",
                "prompt_tokens": 14,
                "completion_tokens": 24,
                "total_tokens": 38,
            },
        }

        response = self.client.post(
            "/api/ai/translate-cv/",
            {"cv_id": str(cv.id), "target_language": "ka"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "CV translated successfully")
        self.assertEqual(response.data["result"]["translated_cv_data"]["summary"], "გამარჯობა")
        self.assertEqual(response.data["translated_cv"]["language"], "ka")
        self.assertEqual(response.data["translated_cv"]["title"], "AI Resume (KA)")
        self.assertEqual(CV.objects.filter(user=user).count(), 2)

    @patch("apps.ai.views.translate_cv_with_openai")
    def test_translate_cv_respects_cv_limit(self, mock_translate):
        user = self.create_user(subscription_tier="pro")
        for index in range(20):
            self.create_cv(user, title=f"CV {index + 1}")
        source_cv = CV.objects.filter(user=user).first()
        self.authenticate(user)
        mock_translate.return_value = {
            "result": {
                "target_language": "ka",
                "translated_cv_data": {"summary": "translated"},
                "notes": ["ok"],
            },
            "meta": {
                "model_name": "test-model",
                "prompt_tokens": 14,
                "completion_tokens": 24,
                "total_tokens": 38,
            },
        }

        response = self.client.post(
            "/api/ai/translate-cv/",
            {"cv_id": str(source_cv.id), "target_language": "ka"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(CV.objects.filter(user=user).count(), 20)

    def test_translate_cv_is_blocked_for_free_users(self):
        user = self.create_user()
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.post(
            "/api/ai/translate-cv/",
            {"cv_id": str(cv.id), "target_language": "ka"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["quota"]["limit"], 0)

    @patch("apps.ai.views.generate_cover_letter_with_openai")
    def test_generate_cover_letter_returns_mocked_result_for_pro_user(self, mock_generate):
        user = self.create_user(subscription_tier="pro")
        cv = self.create_cv(user)
        self.authenticate(user)
        mock_generate.return_value = {
            "result": {
                "cover_letter": "Dear Hiring Manager",
                "subject_line": "Application",
                "notes": ["Looks good"],
            },
            "meta": {
                "model_name": "test-model",
                "prompt_tokens": 15,
                "completion_tokens": 25,
                "total_tokens": 40,
            },
        }

        response = self.client.post(
            "/api/ai/generate-cover-letter/",
            {"cv_id": str(cv.id), "job_description": "Backend engineer role"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["subject_line"], "Application")

    def test_generate_cover_letter_is_blocked_for_free_users(self):
        user = self.create_user()
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.post(
            "/api/ai/generate-cover-letter/",
            {"cv_id": str(cv.id), "job_description": "Backend engineer role"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["quota"]["limit"], 0)
