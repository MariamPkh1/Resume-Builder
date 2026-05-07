from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import CV
from .permissions import IsOwner
from .serializers import CVDetailSerializer, CVListSerializer

from apps.cv_versions.models import CVVersion
from apps.cv_versions.serializers import CVVersionDetailSerializer, CVVersionSerializer
from apps.labels.models import Label
from apps.users.limits import limits_for_user
from .pdf import check_pdf_engine, render_cv_pdf


class CVViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        qs = CV.objects.filter(user=self.request.user)

        label = self.request.query_params.get("label")
        if label:
            qs = qs.filter(labels__id=label)

        archived = self.request.query_params.get("archived")
        if archived is not None:
            qs = qs.filter(is_archived=(archived.lower() == "true"))

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(title__icontains=search)

        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return CVListSerializer
        return CVDetailSerializer

    def perform_create(self, serializer):
        limits = limits_for_user(self.request.user)
        if limits.max_cvs != -1:
            current = CV.objects.filter(user=self.request.user, is_archived=False).count()
            if current >= limits.max_cvs:
                raise PermissionDenied("CV limit reached. Upgrade to create more CVs.")
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        cv = self.get_object()
        limits = limits_for_user(request.user)
        if limits.max_cvs != -1:
            current = CV.objects.filter(user=request.user, is_archived=False).count()
            if current >= limits.max_cvs:
                raise PermissionDenied("CV limit reached. Upgrade to duplicate/create more CVs.")

        new_cv = CV.objects.create(
            user=request.user,
            title=f"{cv.title} (copy)",
            cv_data=cv.cv_data,
            section_order=cv.section_order,
            language=cv.language,
            template=cv.template,
            is_archived=False,
        )

        serializer = CVDetailSerializer(new_cv, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        cv = self.get_object()
        if cv.is_archived:
            return Response({"detail": "Already archived."}, status=status.HTTP_200_OK)

        cv.is_archived = True
        cv.save(update_fields=["is_archived", "updated_at"])
        return Response({"detail": "Archived."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def unarchive(self, request, pk=None):
        cv = self.get_object()
        if not cv.is_archived:
            return Response({"detail": "Already active."}, status=status.HTTP_200_OK)

        cv.is_archived = False
        cv.save(update_fields=["is_archived", "updated_at"])
        return Response({"detail": "Unarchived."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="add-label")
    def add_label(self, request, pk=None):
        cv = self.get_object()
        label_id = request.data.get("label_id")
        if not label_id:
            return Response({"detail": "label_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            label = Label.objects.get(id=label_id, user=request.user)
        except Label.DoesNotExist:
            return Response({"detail": "Label not found."}, status=status.HTTP_404_NOT_FOUND)

        cv.labels.add(label)
        serializer = CVDetailSerializer(cv, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="remove-label")
    def remove_label(self, request, pk=None):
        cv = self.get_object()
        label_id = request.data.get("label_id")
        if not label_id:
            return Response({"detail": "label_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        cv.labels.remove(label_id)
        serializer = CVDetailSerializer(cv, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        cv = self.get_object()
        qs = CVVersion.objects.filter(cv=cv)
        serializer = CVVersionSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="save-version")
    def save_version(self, request, pk=None):
        cv = self.get_object()

        limits = limits_for_user(request.user)

        if limits.max_versions == 0:
            raise PermissionDenied("Version history is not available on Free plan.")

        if limits.max_versions != -1:
            current = CVVersion.objects.filter(cv=cv).count()
            if current >= limits.max_versions:
                raise PermissionDenied("Version limit reached. Upgrade for more history.")

        note = request.data.get("note", "")

        version = CVVersion.objects.create(
            cv=cv,
            title=cv.title,
            cv_data=cv.cv_data,
            section_order=cv.section_order,
            language=cv.language,
            template=cv.template,
            note=note,
        )

        serializer = CVVersionDetailSerializer(version)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="restore-version")
    def restore_version(self, request, pk=None):
        cv = self.get_object()
        version_id = request.data.get("version_id")
        if not version_id:
            return Response({"detail": "version_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            version = CVVersion.objects.get(id=version_id, cv=cv)
        except CVVersion.DoesNotExist:
            return Response({"detail": "Version not found."}, status=status.HTTP_404_NOT_FOUND)

        cv.title = version.title
        cv.cv_data = version.cv_data
        cv.section_order = version.section_order
        cv.language = version.language
        cv.template = version.template
        cv.save()

        serializer = CVDetailSerializer(cv, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="export/pdf")
    def export_pdf(self, request, pk=None):
        cv = self.get_object()

        effective_tier = request.user.effective_tier() if hasattr(request.user, "effective_tier") else "free"
        is_free = effective_tier == "free"

        try:
            template = request.query_params.get("template") or cv.template or "classic"
            pdf_bytes = render_cv_pdf(cv=cv, watermark=is_free, template=template)
            request.user.pdfs_downloaded += 1
            request.user.save(update_fields=["pdfs_downloaded", "updated_at"])

            filename = f"{cv.title}.pdf".replace(" ", "_")
            response = HttpResponse(pdf_bytes, content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            response["X-Ad-Required"] = "true" if is_free else "false"
            response["X-Watermark"] = "true" if is_free else "false"
            response["X-PDF-Engine"] = "weasyprint"
            return response

        except Exception as e:
            # Optional strict mode (useful later in production)
            if getattr(settings, "PDF_ENGINE_STRICT", False):
                payload = {"detail": "PDF export failed."}
                if settings.DEBUG:
                    payload["debug_error"] = str(e)
                return Response(payload, status=status.HTTP_502_BAD_GATEWAY)

            # Fallback/stub response
            payload = {
                "detail": "PDF export stub (PDF engine not available on this machine yet).",
                "cv_id": str(cv.id),
                "title": cv.title,
                "ad_required": is_free,
                "watermark": is_free,
                "pdfs_downloaded": request.user.pdfs_downloaded,  # unchanged on failure
                "pdf_engine_ready": check_pdf_engine()[0],
            }

            # Only expose raw error during debug
            if settings.DEBUG:
                payload["debug_error"] = str(e)

            return Response(payload, status=status.HTTP_200_OK)
