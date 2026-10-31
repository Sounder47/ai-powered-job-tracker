from rest_framework import serializers
from .models import JobDescription


class JobDescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobDescription
        fields = [
            "id", "title", "content", "requirements",
            "mandatory_skills", "preferred_skills",
            "experience_requirements", "created_at"
        ]
        read_only_fields = [
            "id", "requirements", "mandatory_skills",
            "preferred_skills", "experience_requirements", "created_at"
        ]