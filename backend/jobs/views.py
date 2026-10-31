
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import JobApplication
from .serializers import JobApplicationSerializer

from rest_framework import generics
from .models import ApplicationActivity
from .serializers import ApplicationActivitySerializer

from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError

class JobApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = JobApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return JobApplication.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
    def perform_create(self, serializer):
        application = serializer.save(user=self.request.user)

        ApplicationActivity.objects.create(
            application=application,
            activity_type=ApplicationActivity.ActivityType.CREATED,
            description="Application added to the tracker.",
            new_status=application.status,
        )

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        application = serializer.save()

        if old_status != application.status:
            old_label = application.Status(old_status).label
            new_label = application.Status(application.status).label

            ApplicationActivity.objects.create(
                application=application,
                activity_type=ApplicationActivity.ActivityType.STATUS_CHANGED,
                description=f"Status changed from {old_label} to {new_label}.",
                old_status=old_status,
                new_status=application.status,
            )



class ApplicationActivityListView(generics.ListAPIView):
    serializer_class = ApplicationActivitySerializer

    def get_queryset(self):
        return ApplicationActivity.objects.filter(
            application__user=self.request.user
        ).select_related("application")


class RecentActivityListView(generics.ListAPIView):
    serializer_class = ApplicationActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ApplicationActivity.objects.filter(
                application__user=self.request.user
            )
            .select_related("application")
            .order_by("-created_at")[:10]
        )

class ApplicationActivityCreateView(generics.CreateAPIView):
    serializer_class = ApplicationActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        application_id = self.kwargs["application_id"]

        application = JobApplication.objects.filter(
            id=application_id,
            user=self.request.user,
        ).first()

        if application is None:
            raise ValidationError(
                {"application": "Application not found."}
            )

        serializer.save(
            application=application,
            activity_type=ApplicationActivity.ActivityType.NOTE_ADDED,
        )
