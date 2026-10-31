
from rest_framework import serializers

from .models import JobApplication
from rest_framework import serializers
from .models import ApplicationActivity


class JobApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        
        fields = [
            "id",
            "company",
            "job_title",
            "job_url",
            "location",
            "employment_type",
            "status",
            "applied_date",
            "follow_up_date",
            "salary",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ApplicationActivitySerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(
        source="get_activity_type_display",
        read_only=True,
    )

    class Meta:
        model = ApplicationActivity
        fields = [
            "id",
            "activity_type",
            "activity_type_display",
            "description",
            "old_status",
            "new_status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "activity_type",
            "activity_type_display",
            "old_status",
            "new_status",
            "created_at",
        ]