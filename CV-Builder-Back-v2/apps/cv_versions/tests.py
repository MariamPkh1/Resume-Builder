from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.cvs.models import CV
from apps.cv_versions.models import CVVersion

from django.contrib.auth import get_user_model

User = get_user_model()


class CVVersionAPITests(APITestCase):

    # ── Helpers ───────────────────────────────────────────────────────────────

    def create_user(self, email="user@example.com", tier="free", **kwargs):
        return User.objects.create_user(
            email=email,
            password="StrongPass123",
            full_name="Test User",
            is_active=True,
            email_verified=True,
            subscription_tier=tier,
            **kwargs,
        )

    def authenticate(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def create_cv(self, user, **kwargs):
        return CV.objects.create(
            user=user,
            title=kwargs.pop("title", "My CV"),
            cv_data=kwargs.pop("cv_data", {"personal_info": {"fullName": "Test"}}),
            section_order=kwargs.pop("section_order", []),
            language="en",
            template="classic",
            **kwargs,
        )

    def create_version(self, cv, note="v1"):
        return CVVersion.objects.create(
            cv=cv,
            title=cv.title,
            cv_data=cv.cv_data,
            section_order=cv.section_order,
            language=cv.language,
            template=cv.template,
            note=note,
        )

    # ── Authentication ────────────────────────────────────────────────────────

    def test_save_version_requires_authentication(self):
        user = self.create_user()
        cv = self.create_cv(user)

        response = self.client.post(f"/api/cvs/{cv.id}/save-version/", {"note": "v1"})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_versions_requires_authentication(self):
        user = self.create_user()
        cv = self.create_cv(user)

        response = self.client.get(f"/api/cvs/{cv.id}/versions/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_restore_version_requires_authentication(self):
        user = self.create_user()
        cv = self.create_cv(user)
        version = self.create_version(cv)

        response = self.client.post(
            f"/api/cvs/{cv.id}/restore-version/", {"version_id": str(version.id)}
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Free tier — blocked ───────────────────────────────────────────────────

    def test_free_user_cannot_save_version(self):
        user = self.create_user(tier="free")
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.post(f"/api/cvs/{cv.id}/save-version/", {"note": "v1"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(CVVersion.objects.filter(cv=cv).count(), 0)

    # ── Pro tier — save and list ──────────────────────────────────────────────

    def test_pro_user_can_save_version(self):
        user = self.create_user(tier="pro")
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.post(f"/api/cvs/{cv.id}/save-version/", {"note": "first save"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CVVersion.objects.filter(cv=cv).count(), 1)
        version = CVVersion.objects.get(cv=cv)
        self.assertEqual(version.note, "first save")
        self.assertEqual(version.title, cv.title)
        self.assertEqual(version.cv_data, cv.cv_data)
        self.assertEqual(version.language, cv.language)
        self.assertEqual(version.template, cv.template)

    def test_save_version_without_note_is_allowed(self):
        user = self.create_user(tier="pro")
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.post(f"/api/cvs/{cv.id}/save-version/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CVVersion.objects.get(cv=cv).note, "")

    def test_pro_user_can_list_versions(self):
        user = self.create_user(tier="pro")
        cv = self.create_cv(user)
        self.create_version(cv, note="v1")
        self.create_version(cv, note="v2")
        self.authenticate(user)

        response = self.client.get(f"/api/cvs/{cv.id}/versions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_versions_returns_newest_first(self):
        user = self.create_user(tier="pro")
        cv = self.create_cv(user)
        v1 = self.create_version(cv, note="old")
        CVVersion.objects.filter(id=v1.id).update(
            created_at=timezone.now() - timezone.timedelta(hours=1)
        )
        self.create_version(cv, note="new")
        self.authenticate(user)

        response = self.client.get(f"/api/cvs/{cv.id}/versions/")

        self.assertEqual(response.data[0]["note"], "new")
        self.assertEqual(response.data[1]["note"], "old")

    def test_list_versions_does_not_include_cv_data(self):
        user = self.create_user(tier="pro")
        cv = self.create_cv(user)
        self.create_version(cv)
        self.authenticate(user)

        response = self.client.get(f"/api/cvs/{cv.id}/versions/")

        self.assertNotIn("cv_data", response.data[0])
        self.assertNotIn("section_order", response.data[0])

    # ── Pro tier — version cap (10) ───────────────────────────────────────────

    def test_pro_user_cannot_exceed_10_versions(self):
        user = self.create_user(tier="pro")
        cv = self.create_cv(user)
        for i in range(10):
            self.create_version(cv, note=f"v{i}")
        self.authenticate(user)

        response = self.client.post(
            f"/api/cvs/{cv.id}/save-version/", {"note": "v11"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(CVVersion.objects.filter(cv=cv).count(), 10)

    def test_pro_user_can_save_exactly_10_versions(self):
        user = self.create_user(tier="pro")
        cv = self.create_cv(user)
        for i in range(9):
            self.create_version(cv, note=f"v{i}")
        self.authenticate(user)

        response = self.client.post(
            f"/api/cvs/{cv.id}/save-version/", {"note": "v10"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CVVersion.objects.filter(cv=cv).count(), 10)

    # ── Professional tier — unlimited ─────────────────────────────────────────

    def test_professional_user_can_exceed_10_versions(self):
        user = self.create_user(tier="professional")
        cv = self.create_cv(user)
        for i in range(10):
            self.create_version(cv, note=f"v{i}")
        self.authenticate(user)

        response = self.client.post(
            f"/api/cvs/{cv.id}/save-version/", {"note": "v11"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CVVersion.objects.filter(cv=cv).count(), 11)

    # ── Restore version ───────────────────────────────────────────────────────

    def test_restore_version_updates_cv_data(self):
        user = self.create_user(tier="pro")
        cv = self.create_cv(user, cv_data={"personal_info": {"fullName": "Original"}})
        version = self.create_version(cv, note="snapshot")

        cv.cv_data = {"personal_info": {"fullName": "Changed"}}
        cv.save()
        self.authenticate(user)

        response = self.client.post(
            f"/api/cvs/{cv.id}/restore-version/",
            {"version_id": str(version.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cv.refresh_from_db()
        self.assertEqual(cv.cv_data["personal_info"]["fullName"], "Original")

    def test_restore_version_also_restores_template_and_language(self):
        user = self.create_user(tier="pro")
        cv = self.create_cv(user)
        version = CVVersion.objects.create(
            cv=cv,
            title="Old Title",
            cv_data={"personal_info": {}},
            section_order=[],
            language="ka",
            template="europass",
            note="old",
        )
        self.authenticate(user)

        self.client.post(
            f"/api/cvs/{cv.id}/restore-version/",
            {"version_id": str(version.id)},
            format="json",
        )

        cv.refresh_from_db()
        self.assertEqual(cv.language, "ka")
        self.assertEqual(cv.template, "europass")
        self.assertEqual(cv.title, "Old Title")

    def test_restore_version_requires_version_id(self):
        user = self.create_user(tier="pro")
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.post(f"/api/cvs/{cv.id}/restore-version/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_restore_version_rejects_nonexistent_version(self):
        user = self.create_user(tier="pro")
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.post(
            f"/api/cvs/{cv.id}/restore-version/",
            {"version_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ── Ownership isolation ───────────────────────────────────────────────────

    def test_user_cannot_access_another_users_cv_versions(self):
        owner = self.create_user(email="owner@example.com", tier="pro")
        other = self.create_user(email="other@example.com", tier="pro")
        cv = self.create_cv(owner)
        self.create_version(cv)
        self.authenticate(other)

        response = self.client.get(f"/api/cvs/{cv.id}/versions/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_save_version_on_another_users_cv(self):
        owner = self.create_user(email="owner@example.com", tier="pro")
        other = self.create_user(email="other@example.com", tier="pro")
        cv = self.create_cv(owner)
        self.authenticate(other)

        response = self.client.post(
            f"/api/cvs/{cv.id}/save-version/", {"note": "stolen"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(CVVersion.objects.filter(cv=cv).count(), 0)

    def test_user_cannot_restore_version_belonging_to_another_users_cv(self):
        owner = self.create_user(email="owner@example.com", tier="pro")
        attacker = self.create_user(email="attacker@example.com", tier="pro")
        owner_cv = self.create_cv(owner)
        attacker_cv = self.create_cv(attacker)
        owner_version = self.create_version(owner_cv, note="owner snapshot")
        self.authenticate(attacker)

        # Attacker tries to restore owner's version onto their own CV
        response = self.client.post(
            f"/api/cvs/{attacker_cv.id}/restore-version/",
            {"version_id": str(owner_version.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ── Trial user behaves like pro ───────────────────────────────────────────

    def test_trial_user_can_save_version(self):
        user = self.create_user(
            tier="free",
            trial_ends_at=timezone.now() + timezone.timedelta(days=5),
        )
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.post(
            f"/api/cvs/{cv.id}/save-version/", {"note": "trial save"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_trial_user_respects_pro_version_cap(self):
        user = self.create_user(
            tier="free",
            trial_ends_at=timezone.now() + timezone.timedelta(days=5),
        )
        cv = self.create_cv(user)
        for i in range(10):
            self.create_version(cv, note=f"v{i}")
        self.authenticate(user)

        response = self.client.post(
            f"/api/cvs/{cv.id}/save-version/", {"note": "over limit"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
