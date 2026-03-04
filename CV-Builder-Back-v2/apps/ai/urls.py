from django.urls import path
from .views import (
    AnalyzeCVAPIView,
    ImproveSectionAPIView,
    CheckATSAPIView,
    TailorForJobAPIView,
    TranslateCVAPIView,
    GenerateCoverLetterAPIView
)

urlpatterns = [
    path("ai/analyze-cv/", AnalyzeCVAPIView.as_view(), name="ai_analyze_cv"),
    path("ai/improve-section/", ImproveSectionAPIView.as_view(), name="ai_improve_section"),
    path("ai/check-ats/", CheckATSAPIView.as_view(), name="ai_check_ats"),
    path("ai/tailor-for-job/", TailorForJobAPIView.as_view(), name="ai_tailor_for_job"),
    path("ai/translate-cv/", TranslateCVAPIView.as_view(), name="ai_translate_cv"),
    path("ai/generate-cover-letter/", GenerateCoverLetterAPIView.as_view(), name="ai_generate_cover_letter"),
]