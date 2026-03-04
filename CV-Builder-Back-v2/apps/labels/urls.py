from rest_framework.routers import DefaultRouter
from .views import LabelViewSet

router = DefaultRouter()
router.register(r"labels", LabelViewSet, basename="labels")

urlpatterns = router.urls
