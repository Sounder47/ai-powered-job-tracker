from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobDescriptionViewSet, match_resume_job, resume_skills, job_skills

router = DefaultRouter()
router.register("", JobDescriptionViewSet, basename="jobdescription")

urlpatterns = [
    path("", include(router.urls)),
    path("match/", match_resume_job, name="match-resume-job"),
    path("resume/<int:resume_id>/skills/", resume_skills, name="resume-skills"),
    path("job/<int:job_id>/skills/", job_skills, name="job-skills"),
]