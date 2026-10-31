
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ApplicationActivityListView,
    JobApplicationViewSet,
    ApplicationActivityCreateView,
)

from .views import RecentActivityListView

router = DefaultRouter()
router.register(
    "applications",
    JobApplicationViewSet,
    basename="application",
)


urlpatterns = [
    path(
        "applications/<int:application_id>/activities/",
        ApplicationActivityListView.as_view(),
        name="application-activities",
    ),
    path(
        "applications/<int:application_id>/activities/add/",
        ApplicationActivityCreateView.as_view(),
        name="application-activity-create",
    ),
    path(
    "activities/recent/",
    RecentActivityListView.as_view(),
    name="recent-activities",
    ),
    *router.urls,
]
