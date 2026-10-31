from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Resume
from .serializers import ResumeSerializer
from pypdf import PdfReader
from docx import Document
import io


class ResumeViewSet(viewsets.ModelViewSet):
    serializer_class = ResumeSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        resume = serializer.save(user=self.request.user)
        self.extract_text(resume)

    def perform_update(self, serializer):
        resume = serializer.save()
        if resume.file and not resume.extracted_text:
            self.extract_text(resume)

    def extract_text(self, resume):
        try:
            content_type = resume.file.name.lower()
            if content_type.endswith('.pdf'):
                reader = PdfReader(resume.file)
                text = "\n".join([page.extract_text() for page in reader.pages])
                resume.extracted_text = text
                resume.save(update_fields=['extracted_text'])
            elif content_type.endswith('.docx'):
                doc = Document(resume.file)
                text = "\n".join([para.text for para in doc.paragraphs])
                resume.extracted_text = text
                resume.save(update_fields=['extracted_text'])
            elif content_type.endswith('.txt'):
                resume.extracted_text = resume.file.read().decode('utf-8', errors='ignore')
                resume.save(update_fields=['extracted_text'])
        except Exception as e:
            print(f"Error extracting text: {e}")
            resume.extracted_text = ""
            resume.save(update_fields=['extracted_text'])