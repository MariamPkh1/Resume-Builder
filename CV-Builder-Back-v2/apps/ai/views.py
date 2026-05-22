import logging

from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cvs.models import CV
from apps.cvs.serializers import CVDetailSerializer
from apps.users.limits import limits_for_user
from .models import AIUsage
from .quotas import get_ai_quota_status
from .serializers import (
    AnalyzeCVSerializer,
    ImproveSectionSerializer,
    CheckATSSerializer,
    TailorForJobSerializer,
    TranslateCVSerializer,
    GenerateCoverLetterSerializer,
)
from .services import (
    analyze_cv_with_openai,
    improve_section_with_openai,
    check_ats_with_openai,
    tailor_for_job_with_openai,
    translate_cv_with_openai,
    generate_cover_letter_with_openai,
)

logger = logging.getLogger(__name__)


def normalize_ai_language(lang_value) -> tuple[str, str]:
    """
    Returns:
      (lang_code, target_language_name)
    lang_code is normalized to 'en' or 'ka'
    Invalid/missing/blank values fallback to English.
    """
    raw = (lang_value or "").strip().lower()
    if raw == "ka":
        return "ka", "Georgian"
    return "en", "English"

class AnalyzeCVAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AnalyzeCVSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        lang_code, target_language = normalize_ai_language(data.get("language"))
        logger.info(f"AI Request | Endpoint: /api/ai/analyze-cv/ | Lang: {lang_code} | CV: {data.get('cv_id')}")

        try:
            cv = CV.objects.get(id=data["cv_id"], user=request.user)
        except CV.DoesNotExist:
            return Response({"detail": "CV not found."}, status=status.HTTP_404_NOT_FOUND)

        feature = AIUsage.Feature.ANALYZE_CV
        quota = get_ai_quota_status(request.user, feature)

        if not quota["allowed"]:
            AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=False,
                request_payload={
                    "cv_id": str(cv.id),
                    "job_description": data.get("job_description", ""),
                    "language": lang_code,
                    "quota_denied": True,
                },
                error_message=quota["reason"],
            )
            return Response(
                {
                    "detail": quota["reason"],
                    "quota": quota,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            ai_result = analyze_cv_with_openai(
                cv=cv,
                job_description=data.get("job_description", ""),
                language_code=lang_code,
                target_language=target_language,
            )
            analysis = ai_result["analysis"]
            meta = ai_result["meta"]

            usage_row = AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=True,
                model_name=meta.get("model_name", ""),
                prompt_tokens=meta.get("prompt_tokens", 0),
                completion_tokens=meta.get("completion_tokens", 0),
                total_tokens=meta.get("total_tokens", 0),
                estimated_cost_usd=0,
                request_payload={
                    "cv_id": str(cv.id),
                    "job_description": data.get("job_description", ""),
                    "language": lang_code,
                },
                response_payload=analysis,
            )

            quota_after = get_ai_quota_status(request.user, feature)

            return Response(
                {
                    "feature": feature,
                    "cv_id": str(cv.id),
                    "analysis": analysis,
                    "quota": {
                        "used_before": quota["used"],
                        "used_after": quota_after["used"],
                        "limit": quota_after["limit"],
                        "window": quota_after["window"],
                        "remaining": (
                            -1 if quota_after["limit"] == -1
                            else max(quota_after["limit"] - quota_after["used"], 0)
                        ),
                    },
                    "usage": {
                        "model_name": usage_row.model_name,
                        "prompt_tokens": usage_row.prompt_tokens,
                        "completion_tokens": usage_row.completion_tokens,
                        "total_tokens": usage_row.total_tokens,
                    },
                    "stub": False,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=False,
                model_name=getattr(settings, "OPENAI_MODEL", ""),
                request_payload={
                    "cv_id": str(cv.id),
                    "job_description": data.get("job_description", ""),
                    "language": lang_code,
                },
                error_message=str(e),
            )
            return Response(
                {
                    "detail": "AI analysis failed.",
                    "error": str(e),  # hide/remove in production
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
class ImproveSectionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ImproveSectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        lang_code, target_language = normalize_ai_language(data.get("language"))
        logger.info(f"AI Request | Endpoint: /api/ai/improve-section/ | Lang: {lang_code} | CV: {data.get('cv_id')}")

        try:
            cv = CV.objects.get(id=data["cv_id"], user=request.user)
        except CV.DoesNotExist:
            return Response({"detail": "CV not found."}, status=status.HTTP_404_NOT_FOUND)

        feature = AIUsage.Feature.IMPROVE_SECTION
        quota = get_ai_quota_status(request.user, feature)

        if not quota["allowed"]:
            AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=False,
                request_payload={
                    "cv_id": str(cv.id),
                    "section_name": data["section_name"],
                    "language": lang_code,
                    "quota_denied": True,
                },
                error_message=quota["reason"],
            )
            return Response(
                {"detail": quota["reason"], "quota": quota},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            ai_result = improve_section_with_openai(
                cv=cv,
                section_name=data["section_name"],
                section_content=data["section_content"],
                job_description=data.get("job_description", ""),
                language_code=lang_code,
                target_language=target_language,
            )
            result = ai_result["result"]
            meta = ai_result["meta"]

            usage_row = AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=True,
                model_name=meta.get("model_name", ""),
                prompt_tokens=meta.get("prompt_tokens", 0),
                completion_tokens=meta.get("completion_tokens", 0),
                total_tokens=meta.get("total_tokens", 0),
                estimated_cost_usd=0,
                request_payload={
                    "cv_id": str(cv.id),
                    "section_name": data["section_name"],
                    "section_content": data["section_content"],
                    "job_description": data.get("job_description", ""),
                    "language": lang_code,
                },
                response_payload=result,
            )

            quota_after = get_ai_quota_status(request.user, feature)

            return Response(
                {
                    "feature": feature,
                    "cv_id": str(cv.id),
                    "section_name": data["section_name"],
                    "result": result,
                    "quota": {
                        "used_before": quota["used"],
                        "used_after": quota_after["used"],
                        "limit": quota_after["limit"],
                        "window": quota_after["window"],
                        "remaining": (
                            -1 if quota_after["limit"] == -1
                            else max(quota_after["limit"] - quota_after["used"], 0)
                        ),
                    },
                    "usage": {
                        "model_name": usage_row.model_name,
                        "prompt_tokens": usage_row.prompt_tokens,
                        "completion_tokens": usage_row.completion_tokens,
                        "total_tokens": usage_row.total_tokens,
                    },
                    "stub": False,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=False,
                model_name=getattr(settings, "OPENAI_MODEL", ""),
                request_payload={
                    "cv_id": str(cv.id),
                    "section_name": data["section_name"],
                    "language": lang_code,
                },
                error_message=str(e),
            )
            return Response(
                {
                    "detail": "AI section improvement failed.",
                    "error": str(e),  # hide/remove in production
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

class CheckATSAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckATSSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        lang_code, target_language = normalize_ai_language(data.get("language"))
        logger.info(f"AI Request | Endpoint: /api/ai/check-ats/ | Lang: {lang_code} | CV: {data.get('cv_id')}")

        try:
            cv = CV.objects.get(id=data["cv_id"], user=request.user)
        except CV.DoesNotExist:
            return Response({"detail": "CV not found."}, status=status.HTTP_404_NOT_FOUND)

        feature = AIUsage.Feature.CHECK_ATS
        quota = get_ai_quota_status(request.user, feature)

        if not quota["allowed"]:
            AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=False,
                request_payload={
                    "cv_id": str(cv.id),
                    "language": lang_code,
                    "quota_denied": True,
                },
                error_message=quota["reason"],
            )
            return Response(
                {"detail": quota["reason"], "quota": quota},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            ai_result = check_ats_with_openai(
                cv=cv,
                job_description=data.get("job_description", ""),
                language_code=lang_code,
                target_language=target_language,
            )
            result = ai_result["result"]
            meta = ai_result["meta"]

            usage_row = AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=True,
                model_name=meta.get("model_name", ""),
                prompt_tokens=meta.get("prompt_tokens", 0),
                completion_tokens=meta.get("completion_tokens", 0),
                total_tokens=meta.get("total_tokens", 0),
                estimated_cost_usd=0,
                request_payload={
                    "cv_id": str(cv.id),
                    "job_description": data.get("job_description", ""),
                    "language": lang_code,
                },
                response_payload=result,
            )

            if isinstance(cv.cv_data, dict):
                cv_data = dict(cv.cv_data)
                cv_data["_ats_last_check"] = {
                    "score": result.get("ats_score"),
                }
                cv.cv_data = cv_data
                cv.save(update_fields=["cv_data", "updated_at"])

            quota_after = get_ai_quota_status(request.user, feature)

            return Response(
                {
                    "feature": feature,
                    "cv_id": str(cv.id),
                    "result": result,
                    "quota": {
                        "used_before": quota["used"],
                        "used_after": quota_after["used"],
                        "limit": quota_after["limit"],
                        "window": quota_after["window"],
                        "remaining": (
                            -1 if quota_after["limit"] == -1
                            else max(quota_after["limit"] - quota_after["used"], 0)
                        ),
                    },
                    "usage": {
                        "model_name": usage_row.model_name,
                        "prompt_tokens": usage_row.prompt_tokens,
                        "completion_tokens": usage_row.completion_tokens,
                        "total_tokens": usage_row.total_tokens,
                    },
                    "stub": False,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=False,
                model_name=getattr(settings, "OPENAI_MODEL", ""),
                request_payload={
                    "cv_id": str(cv.id),
                    "language": lang_code,
                },
                error_message=str(e),
            )
            return Response(
                {
                    "detail": "AI ATS check failed.",
                    "error": str(e),  # hide/remove in production
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )


class TailorForJobAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TailorForJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        lang_code, target_language = normalize_ai_language(data.get("language"))
        logger.info(f"AI Request | Endpoint: /api/ai/tailor-for-job/ | Lang: {lang_code} | CV: {data.get('cv_id')}")

        try:
            cv = CV.objects.get(id=data["cv_id"], user=request.user)
        except CV.DoesNotExist:
            return Response({"detail": "CV not found."}, status=status.HTTP_404_NOT_FOUND)

        feature = AIUsage.Feature.TAILOR_FOR_JOB
        quota = get_ai_quota_status(request.user, feature)

        if not quota["allowed"]:
            AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=False,
                request_payload={
                    "cv_id": str(cv.id),
                    "language": lang_code,
                    "quota_denied": True,
                },
                error_message=quota["reason"],
            )
            return Response(
                {"detail": quota["reason"], "quota": quota},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            ai_result = tailor_for_job_with_openai(
                cv=cv,
                job_description=data["job_description"],
                focus_sections=data.get("focus_sections", []),
                language_code=lang_code,
                target_language=target_language,
            )
            result = ai_result["result"]
            meta = ai_result["meta"]

            usage_row = AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=True,
                model_name=meta.get("model_name", ""),
                prompt_tokens=meta.get("prompt_tokens", 0),
                completion_tokens=meta.get("completion_tokens", 0),
                total_tokens=meta.get("total_tokens", 0),
                estimated_cost_usd=0,
                request_payload={
                    "cv_id": str(cv.id),
                    "job_description": data["job_description"],
                    "focus_sections": data.get("focus_sections", []),
                    "language": lang_code,
                },
                response_payload=result,
            )

            quota_after = get_ai_quota_status(request.user, feature)

            return Response(
                {
                    "feature": feature,
                    "cv_id": str(cv.id),
                    "result": result,
                    "quota": {
                        "used_before": quota["used"],
                        "used_after": quota_after["used"],
                        "limit": quota_after["limit"],
                        "window": quota_after["window"],
                        "remaining": (
                            -1 if quota_after["limit"] == -1
                            else max(quota_after["limit"] - quota_after["used"], 0)
                        ),
                    },
                    "usage": {
                        "model_name": usage_row.model_name,
                        "prompt_tokens": usage_row.prompt_tokens,
                        "completion_tokens": usage_row.completion_tokens,
                        "total_tokens": usage_row.total_tokens,
                    },
                    "stub": False,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=False,
                model_name=getattr(settings, "OPENAI_MODEL", ""),
                request_payload={
                    "cv_id": str(cv.id),
                    "language": lang_code,
                },
                error_message=str(e),
            )
            return Response(
                {
                    "detail": "AI job tailoring failed.",
                    "error": str(e),  # hide/remove in production
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

class TranslateCVAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TranslateCVSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            cv = CV.objects.get(id=data["cv_id"], user=request.user)
        except CV.DoesNotExist:
            return Response({"detail": "CV not found."}, status=status.HTTP_404_NOT_FOUND)

        from apps.users.limits import user_at_cv_limit

        if user_at_cv_limit(request.user):
            raise PermissionDenied("CV limit reached. Upgrade to create translated copies.")

        feature = AIUsage.Feature.TRANSLATE_CV
        quota = get_ai_quota_status(request.user, feature)

        if not quota["allowed"]:
            AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=False,
                request_payload={
                    "cv_id": str(cv.id),
                    "target_language": data["target_language"],
                    "quota_denied": True,
                },
                error_message=quota["reason"],
            )
            return Response({"detail": quota["reason"], "quota": quota}, status=status.HTTP_403_FORBIDDEN)

        try:
            ai_result = translate_cv_with_openai(
                cv=cv,
                target_language=data["target_language"],
                source_language=data.get("source_language"),
            )
            result = ai_result["result"]
            meta = ai_result["meta"]

            usage_row = AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=True,
                model_name=meta.get("model_name", ""),
                prompt_tokens=meta.get("prompt_tokens", 0),
                completion_tokens=meta.get("completion_tokens", 0),
                total_tokens=meta.get("total_tokens", 0),
                estimated_cost_usd=0,
                request_payload={
                    "cv_id": str(cv.id),
                    "target_language": data["target_language"],
                    "source_language": data.get("source_language"),
                },
                response_payload=result,
            )

            translated_cv = CV.objects.create(
                user=request.user,
                title=f"{cv.title} ({data['target_language'].upper()})",
                cv_data=result.get("translated_cv_data", cv.cv_data),
                section_order=cv.section_order,
                language=data["target_language"],
                template=cv.template,
                is_archived=False,
            )
            translated_cv.labels.set(cv.labels.all())

            quota_after = get_ai_quota_status(request.user, feature)

            return Response(
                {
                    "success": True,
                    "message": "CV translated successfully",
                    "feature": feature,
                    "cv_id": str(cv.id),
                    "result": result,
                    "translated_cv": CVDetailSerializer(translated_cv, context={"request": request}).data,
                    "quota": {
                        "used_before": quota["used"],
                        "used_after": quota_after["used"],
                        "limit": quota_after["limit"],
                        "window": quota_after["window"],
                        "remaining": (
                            -1 if quota_after["limit"] == -1
                            else max(quota_after["limit"] - quota_after["used"], 0)
                        ),
                    },
                    "usage": {
                        "model_name": usage_row.model_name,
                        "prompt_tokens": usage_row.prompt_tokens,
                        "completion_tokens": usage_row.completion_tokens,
                        "total_tokens": usage_row.total_tokens,
                    },
                    "stub": False,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=False,
                model_name=getattr(settings, "OPENAI_MODEL", ""),
                request_payload={
                    "cv_id": str(cv.id),
                    "target_language": data["target_language"],
                },
                error_message=str(e),
            )
            return Response(
                {
                    "detail": "AI translation failed.",
                    "error": str(e),  # hide/remove in production
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

class GenerateCoverLetterAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GenerateCoverLetterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            cv = CV.objects.get(id=data["cv_id"], user=request.user)
        except CV.DoesNotExist:
            return Response({"detail": "CV not found."}, status=status.HTTP_404_NOT_FOUND)

        feature = AIUsage.Feature.GENERATE_COVER_LETTER
        quota = get_ai_quota_status(request.user, feature)

        if not quota["allowed"]:
            AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=False,
                request_payload={
                    "cv_id": str(cv.id),
                    "quota_denied": True,
                },
                error_message=quota["reason"],
            )
            return Response({"detail": quota["reason"], "quota": quota}, status=status.HTTP_403_FORBIDDEN)

        try:
            ai_result = generate_cover_letter_with_openai(
                cv=cv,
                job_description=data["job_description"],
                company_name=data.get("company_name", ""),
                tone=data.get("tone", "professional"),
            )
            result = ai_result["result"]
            meta = ai_result["meta"]

            usage_row = AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=True,
                model_name=meta.get("model_name", ""),
                prompt_tokens=meta.get("prompt_tokens", 0),
                completion_tokens=meta.get("completion_tokens", 0),
                total_tokens=meta.get("total_tokens", 0),
                estimated_cost_usd=0,
                request_payload={
                    "cv_id": str(cv.id),
                    "job_description": data["job_description"],
                    "company_name": data.get("company_name", ""),
                    "tone": data.get("tone", "professional"),
                },
                response_payload=result,
            )

            quota_after = get_ai_quota_status(request.user, feature)

            return Response(
                {
                    "feature": feature,
                    "cv_id": str(cv.id),
                    "result": result,
                    "quota": {
                        "used_before": quota["used"],
                        "used_after": quota_after["used"],
                        "limit": quota_after["limit"],
                        "window": quota_after["window"],
                        "remaining": (
                            -1 if quota_after["limit"] == -1
                            else max(quota_after["limit"] - quota_after["used"], 0)
                        ),
                    },
                    "usage": {
                        "model_name": usage_row.model_name,
                        "prompt_tokens": usage_row.prompt_tokens,
                        "completion_tokens": usage_row.completion_tokens,
                        "total_tokens": usage_row.total_tokens,
                    },
                    "stub": False,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            AIUsage.objects.create(
                user=request.user,
                feature=feature,
                success=False,
                model_name=getattr(settings, "OPENAI_MODEL", ""),
                request_payload={"cv_id": str(cv.id)},
                error_message=str(e),
            )
            return Response(
                {"detail": "AI cover letter generation failed.", "error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
