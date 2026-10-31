from rest_framework import serializers
from .models import Resume

class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ["id", "title", "file", "extracted_text", "created_at"]
        read_only_fields = ["id", "created_at"]