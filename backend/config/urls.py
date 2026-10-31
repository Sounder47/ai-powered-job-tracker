from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

from .api_views import health_check


def home(request):
    return JsonResponse({
        "message": "Welcome to the AI Job Tracker API",
        "health": "/api/v1/health/",
    })


urlpatterns = [
    path("", home),
    path("admin/", admin.site.urls),
    path("api/v1/health/", health_check, name="health-check"),
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/jobs/", include("jobs.urls")),
    path("api/v1/resumes/", include("resumes.urls")),
    path("api/v1/analyses/", include("analyses.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)