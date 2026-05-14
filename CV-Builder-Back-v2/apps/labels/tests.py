from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth import get_user_model

from apps.labels.models import Label
from apps.cvs.models import CV

User = get_user_model()


class LabelAPITests(APITestCase):

    # ── Helpers ───────────────────────────────────────────────────────────────

    def create_user(self, email="user@example.com", **kwargs):
        return User.objects.create_user(
            email=email,
            password="StrongPass123",
            full_name="Test User",
            is_active=True,
            email_verified=True,
            **kwargs,
        )

    def authenticate(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def create_label(self, user, name="Work", color="#ff0000"):
        return Label.objects.create(user=user, name=name, color=color)

    def create_cv(self, user):
        return CV.objects.create(
            user=user,
            title="Test CV",
            cv_data={},
            section_order=[],
            language="en",
            template="classic",
        )

    # ── Authentication ────────────────────────────────────────────────────────

    def test_list_labels_requires_authentication(self):
        response = self.client.get("/api/labels/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_label_requires_authentication(self):
        response = self.client.post("/api/labels/", {"name": "Work"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Create ────────────────────────────────────────────────────────────────

    def test_create_label_with_name_and_color(self):
        user = self.create_user()
        self.authenticate(user)

        response = self.client.post(
            "/api/labels/", {"name": "Work", "color": "#ff0000"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Work")
        self.assertEqual(response.data["color"], "#ff0000")
        self.assertIn("id", response.data)
        self.assertIn("created_at", response.data)
        self.assertEqual(Label.objects.filter(user=user).count(), 1)

    def test_create_label_without_color(self):
        user = self.create_user()
        self.authenticate(user)

        response = self.client.post("/api/labels/", {"name": "Personal"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["color"], "")

    def test_create_label_requires_name(self):
        user = self.create_user()
        self.authenticate(user)

        response = self.client.post("/api/labels/", {"color": "#fff"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_create_label_sets_owner_to_current_user(self):
        user = self.create_user()
        self.authenticate(user)

        self.client.post("/api/labels/", {"name": "Mine"}, format="json")

        label = Label.objects.get(name="Mine")
        self.assertEqual(label.user, user)

    def test_duplicate_label_name_for_same_user_is_rejected(self):
        user = self.create_user()
        self.create_label(user, name="Work")
        self.authenticate(user)

        response = self.client.post("/api/labels/", {"name": "Work"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_same_label_name_allowed_for_different_users(self):
        user1 = self.create_user(email="user1@example.com")
        user2 = self.create_user(email="user2@example.com")
        self.create_label(user1, name="Work")
        self.authenticate(user2)

        response = self.client.post("/api/labels/", {"name": "Work"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ── List ──────────────────────────────────────────────────────────────────

    def test_list_returns_only_current_users_labels(self):
        user1 = self.create_user(email="user1@example.com")
        user2 = self.create_user(email="user2@example.com")
        self.create_label(user1, name="User1 Label")
        self.create_label(user2, name="User2 Label")
        self.authenticate(user1)

        response = self.client.get("/api/labels/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [l["name"] for l in response.data]
        self.assertIn("User1 Label", names)
        self.assertNotIn("User2 Label", names)

    def test_list_returns_labels_alphabetically(self):
        user = self.create_user()
        self.create_label(user, name="Zebra")
        self.create_label(user, name="Apple")
        self.create_label(user, name="Mango")
        self.authenticate(user)

        response = self.client.get("/api/labels/")

        names = [l["name"] for l in response.data]
        self.assertEqual(names, sorted(names))

    def test_list_is_empty_for_new_user(self):
        user = self.create_user()
        self.authenticate(user)

        response = self.client.get("/api/labels/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    # ── Retrieve ──────────────────────────────────────────────────────────────

    def test_retrieve_own_label(self):
        user = self.create_user()
        label = self.create_label(user, name="Work")
        self.authenticate(user)

        response = self.client.get(f"/api/labels/{label.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Work")

    def test_cannot_retrieve_another_users_label(self):
        owner = self.create_user(email="owner@example.com")
        other = self.create_user(email="other@example.com")
        label = self.create_label(owner, name="Private")
        self.authenticate(other)

        response = self.client.get(f"/api/labels/{label.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ── Update ────────────────────────────────────────────────────────────────

    def test_update_label_name_and_color(self):
        user = self.create_user()
        label = self.create_label(user, name="Old", color="#000")
        self.authenticate(user)

        response = self.client.patch(
            f"/api/labels/{label.id}/",
            {"name": "New", "color": "#fff"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        label.refresh_from_db()
        self.assertEqual(label.name, "New")
        self.assertEqual(label.color, "#fff")

    def test_cannot_update_another_users_label(self):
        owner = self.create_user(email="owner@example.com")
        other = self.create_user(email="other@example.com")
        label = self.create_label(owner, name="Original")
        self.authenticate(other)

        response = self.client.patch(
            f"/api/labels/{label.id}/", {"name": "Hacked"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        label.refresh_from_db()
        self.assertEqual(label.name, "Original")

    # ── Delete ────────────────────────────────────────────────────────────────

    def test_delete_own_label(self):
        user = self.create_user()
        label = self.create_label(user, name="Temp")
        self.authenticate(user)

        response = self.client.delete(f"/api/labels/{label.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Label.objects.filter(id=label.id).exists())

    def test_cannot_delete_another_users_label(self):
        owner = self.create_user(email="owner@example.com")
        other = self.create_user(email="other@example.com")
        label = self.create_label(owner)
        self.authenticate(other)

        response = self.client.delete(f"/api/labels/{label.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Label.objects.filter(id=label.id).exists())

    # ── CV integration ────────────────────────────────────────────────────────

    def test_add_label_to_cv(self):
        user = self.create_user()
        cv = self.create_cv(user)
        label = self.create_label(user, name="Important")
        self.authenticate(user)

        response = self.client.post(
            f"/api/cvs/{cv.id}/add-label/", {"label_id": str(label.id)}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(label, cv.labels.all())

    def test_remove_label_from_cv(self):
        user = self.create_user()
        cv = self.create_cv(user)
        label = self.create_label(user, name="Important")
        cv.labels.add(label)
        self.authenticate(user)

        response = self.client.post(
            f"/api/cvs/{cv.id}/remove-label/", {"label_id": str(label.id)}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn(label, cv.labels.all())

    def test_add_label_to_cv_requires_label_id(self):
        user = self.create_user()
        cv = self.create_cv(user)
        self.authenticate(user)

        response = self.client.post(f"/api/cvs/{cv.id}/add-label/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_add_another_users_label_to_cv(self):
        owner = self.create_user(email="owner@example.com")
        other = self.create_user(email="other@example.com")
        cv = self.create_cv(owner)
        other_label = self.create_label(other, name="Foreign")
        self.authenticate(owner)

        response = self.client.post(
            f"/api/cvs/{cv.id}/add-label/",
            {"label_id": str(other_label.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertNotIn(other_label, cv.labels.all())

    def test_deleting_label_removes_it_from_cv(self):
        user = self.create_user()
        cv = self.create_cv(user)
        label = self.create_label(user, name="ToDelete")
        cv.labels.add(label)
        self.authenticate(user)

        self.client.delete(f"/api/labels/{label.id}/")

        self.assertFalse(Label.objects.filter(id=label.id).exists())
        self.assertEqual(cv.labels.count(), 0)

    def test_cv_list_can_be_filtered_by_label(self):
        user = self.create_user()
        label = self.create_label(user, name="Filtered")
        cv_with = self.create_cv(user)
        cv_without = self.create_cv(user)
        cv_with.title = "With Label"
        cv_with.save()
        cv_without.title = "Without Label"
        cv_without.save()
        cv_with.labels.add(label)
        self.authenticate(user)

        response = self.client.get(f"/api/cvs/?label={label.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [cv["title"] for cv in response.data]
        self.assertIn("With Label", titles)
        self.assertNotIn("Without Label", titles)
