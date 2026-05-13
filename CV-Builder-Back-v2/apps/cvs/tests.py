from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.cvs.models import CV
from apps.cv_versions.models import CVVersion
from apps.labels.models import Label


User = get_user_model()


class CVAPITests(APITestCase):
    def create_user(self, **overrides):
        data = {
            "email": "owner@example.com",
            "password": "StrongPass123",
            "full_name": "Owner User",
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
            "title": "Backend Engineer Resume",
            "cv_data": {"personalInfo": {"fullName": "Owner User"}},
            "section_order": ["personalInfo", "experience"],
            "language": "en",
            "template": "modern",
        }
        data.update(overrides)
        return CV.objects.create(**data)

    def test_list_returns_only_authenticated_users_cvs(self):
        owner = self.create_user()
        other = self.create_user(email="other@example.com")
        own_cv = self.create_cv(owner, title="Mine")
        self.create_cv(other, title="Not Mine")
        self.authenticate(owner)

        response = self.client.get("/api/cvs/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(own_cv.id))

    def test_create_cv_sets_current_user(self):
        user = self.create_user()
        self.authenticate(user)

        response = self.client.post(
            "/api/cvs/",
            {
                "title": "New Resume",
                "cv_data": {"summary": "Test"},
                "section_order": ["summary"],
                "language": "en",
                "template": "modern",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = CV.objects.get(id=response.data["id"])
        self.assertEqual(created.user_id, user.id)

    def test_free_user_cannot_create_more_than_two_active_cvs(self):
        user = self.create_user()
        self.create_cv(user, title="CV 1")
        self.create_cv(user, title="CV 2")
        self.authenticate(user)

        response = self.client.post(
            "/api/cvs/",
            {
                "title": "CV 3",
                "cv_data": {},
                "section_order": [],
                "language": "en",
                "template": "modern",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(CV.objects.filter(user=user).count(), 2)

    def test_user_cannot_access_another_users_cv(self):
        owner = self.create_user()
        other = self.create_user(email="other@example.com")
        cv = self.create_cv(other)
        self.authenticate(owner)

        response = self.client.get(f"/api/cvs/{cv.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_duplicate_creates_copy(self):
        user = self.create_user()
        cv = self.create_cv(user, title="Original CV")
        self.authenticate(user)

        response = self.client.post(f"/api/cvs/{cv.id}/duplicate/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        duplicated = CV.objects.get(id=response.data["id"])
        self.assertEqual(duplicated.title, "Original CV (copy)")
        self.assertEqual(duplicated.cv_data, cv.cv_data)

    def test_archive_and_unarchive_toggle_state(self):
        user = self.create_user()
        cv = self.create_cv(user)
        self.authenticate(user)

        archive_response = self.client.post(f"/api/cvs/{cv.id}/archive/")
        self.assertEqual(archive_response.status_code, status.HTTP_200_OK)
        cv.refresh_from_db()
        self.assertTrue(cv.is_archived)

        unarchive_response = self.client.post(f"/api/cvs/{cv.id}/unarchive/")
        self.assertEqual(unarchive_response.status_code, status.HTTP_200_OK)
        cv.refresh_from_db()
        self.assertFalse(cv.is_archived)

    def test_add_and_remove_label(self):
        user = self.create_user()
        cv = self.create_cv(user)
        label = Label.objects.create(user=user, name="Tech", color="#000")
        self.authenticate(user)

        add_response = self.client.post(
            f"/api/cvs/{cv.id}/add-label/",
            {"label_id": str(label.id)},
            format="json",
        )
        self.assertEqual(add_response.status_code, status.HTTP_200_OK)
        cv.refresh_from_db()
        self.assertEqual(cv.labels.count(), 1)

        remove_response = self.client.post(
            f"/api/cvs/{cv.id}/remove-label/",
            {"label_id": str(label.id)},
            format="json",
        )
        self.assertEqual(remove_response.status_code, status.HTTP_200_OK)
        cv.refresh_from_db()
        self.assertEqual(cv.labels.count(), 0)

    def test_free_plan_cannot_save_versions(self):
        user = self.create_user()
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.post(
            f"/api/cvs/{cv.id}/save-version/",
            {"note": "snapshot"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(CVVersion.objects.count(), 0)

    def test_pro_user_can_save_and_restore_version(self):
        user = self.create_user(subscription_tier="pro")
        cv = self.create_cv(user, title="Original Title", cv_data={"summary": "v1"})
        self.authenticate(user)

        save_response = self.client.post(
            f"/api/cvs/{cv.id}/save-version/",
            {"note": "before edit"},
            format="json",
        )

        self.assertEqual(save_response.status_code, status.HTTP_201_CREATED)
        version_id = save_response.data["id"]

        cv.title = "Edited Title"
        cv.cv_data = {"summary": "v2"}
        cv.save(update_fields=["title", "cv_data", "updated_at"])

        restore_response = self.client.post(
            f"/api/cvs/{cv.id}/restore-version/",
            {"version_id": version_id},
            format="json",
        )

        self.assertEqual(restore_response.status_code, status.HTTP_200_OK)
        cv.refresh_from_db()
        self.assertEqual(cv.title, "Original Title")
        self.assertEqual(cv.cv_data, {"summary": "v1"})

    def test_versions_lists_saved_versions(self):
        user = self.create_user(subscription_tier="pro")
        cv = self.create_cv(user)
        version = CVVersion.objects.create(
            cv=cv,
            title=cv.title,
            cv_data=cv.cv_data,
            section_order=cv.section_order,
            language=cv.language,
            template=cv.template,
            note="snapshot",
        )
        self.authenticate(user)

        response = self.client.get(f"/api/cvs/{cv.id}/versions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(version.id))

    def test_export_pdf_returns_pdf_or_stub_payload(self):
        user = self.create_user()
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.get(f"/api/cvs/{cv.id}/export/pdf/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        if response["Content-Type"] == "application/pdf":
            user.refresh_from_db()
            self.assertEqual(user.pdfs_downloaded, 1)
            self.assertEqual(response["X-Watermark"], "true")
        else:
            self.assertIn("detail", response.data)

    @patch("apps.cvs.views.render_cv_pdf", side_effect=RuntimeError("engine missing"))
    @patch("apps.cvs.views.check_pdf_engine", return_value=(False, "engine missing"))
    def test_export_pdf_stub_keeps_download_count_unchanged(self, mock_check, mock_render):
        user = self.create_user()
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.get(f"/api/cvs/{cv.id}/export/pdf/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pdf_engine_ready"], False)
        user.refresh_from_db()
        self.assertEqual(user.pdfs_downloaded, 0)
        self.assertTrue(mock_render.called)
        self.assertTrue(mock_check.called)

    @patch("apps.cvs.management.commands.check_pdf_engine.check_pdf_engine", return_value=(True, ""))
    def test_check_pdf_engine_command_succeeds_when_engine_ready(self, mock_check):
        output = StringIO()

        call_command("check_pdf_engine", stdout=output)

        self.assertIn("PDF engine ready", output.getvalue())
        self.assertTrue(mock_check.called)

    @patch("apps.cvs.management.commands.check_pdf_engine.check_pdf_engine", return_value=(False, "missing cairo"))
    def test_check_pdf_engine_command_fails_when_engine_unavailable(self, mock_check):
        with self.assertRaisesMessage(Exception, "PDF engine unavailable: missing cairo"):
            call_command("check_pdf_engine")
        self.assertTrue(mock_check.called)
