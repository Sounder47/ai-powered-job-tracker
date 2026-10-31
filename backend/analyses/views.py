from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import JobDescription
from .serializers import JobDescriptionSerializer
from resumes.models import Resume
import re
import difflib


class JobDescriptionViewSet(viewsets.ModelViewSet):
    serializer_class = JobDescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JobDescription.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        job_desc = serializer.save(user=self.request.user)
        self.analyze_job_description(job_desc)

    def perform_update(self, serializer):
        job_desc = serializer.save()
        if job_desc.content:
            self.analyze_job_description(job_desc)

    def analyze_job_description(self, job_desc):
        content = job_desc.content
        mandatory_skills = []
        preferred_skills = []
        experience_requirements = []

        skill_pattern = re.compile(
            r'\b(python|java|javascript|typescript|react|angular|vue|django|flask|fastapi|sql|postgresql|mysql|mongodb|redis|docker|kubernetes|aws|azure|gcp|git|linux|shell|pandas|numpy|tensorflow|pytorch|machine learning|deep learning|nlp|rest api|graphql|ci/cd|devops)\b',
            re.IGNORECASE
        )

        mandatory_keywords = ['required', 'must have', 'essential', 'minimum', 'mandatory']
        preferred_keywords = ['preferred', 'nice to have', 'bonus', 'desired', 'plus']

        lines = content.split('\n')
        current_section = 'general'
        for line in lines:
            line_lower = line.lower()
            if any(kw in line_lower for kw in ['years', 'experience', 'exp']):
                experience_requirements.append(line.strip())
            elif any(kw in line_lower for kw in mandatory_keywords):
                skills = skill_pattern.findall(line)
                mandatory_skills.extend(skills)
                current_section = 'mandatory'
            elif any(kw in line_lower for kw in preferred_keywords):
                skills = skill_pattern.findall(line)
                preferred_skills.extend(skills)
                current_section = 'preferred'

        # Also scan entire content for skills if sections not clear
        all_skills = set(skill_pattern.findall(content.lower()))
        if not mandatory_skills and not preferred_skills:
            mandatory_skills = list(all_skills)
        elif mandatory_skills or preferred_skills:
            found_skills = set(mandatory_skills + preferred_skills)
            missing_skills = all_skills - found_skills
            preferred_skills.extend(list(missing_skills))

        # Deduplicate
        mandatory_skills = list(dict.fromkeys(mandatory_skills))
        preferred_skills = list(dict.fromkeys(preferred_skills))
        experience_requirements = list(dict.fromkeys(experience_requirements))[:5]

        job_desc.mandatory_skills = ', '.join(mandatory_skills)
        job_desc.preferred_skills = ', '.join(preferred_skills)
        job_desc.experience_requirements = '\n'.join(experience_requirements)
        job_desc.requirements = f"Mandatory: {job_desc.mandatory_skills}\nPreferred: {job_desc.preferred_skills}"
        job_desc.save(update_fields=['requirements', 'mandatory_skills', 'preferred_skills', 'experience_requirements'])


def extract_skills(text):
    skill_keywords = [
        'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
        'django', 'flask', 'fastapi', 'sql', 'postgresql', 'mysql', 'mongodb',
        'redis', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'linux',
        'shell', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'machine learning',
        'deep learning', 'nlp', 'rest api', 'graphql', 'ci/cd', 'devops',
        'html', 'css', 'node.js', 'express', 'spring', 'hibernate', 'jpa',
        'microservices', 'api design', 'testing', 'jest', 'pytest', 'junit',
        'agile', 'scrum', 'kanban', 'jira', 'confluence', 'terraform', 'ansible',
        'kafka', 'rabbitmq', 'elasticsearch', 'spark', 'hadoop', 'airflow',
        'tableau', 'power bi', 'looker', 'snowflake', 'bigquery', 'redshift'
    ]
    text_lower = text.lower()
    found = set()
    for skill in skill_keywords:
        if skill in text_lower:
            found.add(skill)
    return found


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def match_resume_job(request):
    resume_id = request.data.get('resume_id')
    job_id = request.data.get('job_description_id')

    if not resume_id or not job_id:
        return Response({'error': 'Both resume_id and job_description_id are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        resume = Resume.objects.get(id=resume_id, user=request.user)
        job = JobDescription.objects.get(id=job_id, user=request.user)
    except (Resume.DoesNotExist, JobDescription.DoesNotExist):
        return Response({'error': 'Resume or Job Description not found'}, status=status.HTTP_404_NOT_FOUND)

    if not resume.extracted_text:
        return Response({'error': 'Resume text not extracted yet'}, status=status.HTTP_400_BAD_REQUEST)

    resume_skills = extract_skills(resume.extracted_text)
    mandatory_skills = set(s.strip().lower() for s in job.mandatory_skills.split(',') if s.strip())
    preferred_skills = set(s.strip().lower() for s in job.preferred_skills.split(',') if s.strip())
    all_required = mandatory_skills | preferred_skills

    matched = resume_skills & all_required
    missing = all_required - resume_skills
    partially_matched = set()

    for req in missing:
        for rs in resume_skills:
            if difflib.SequenceMatcher(None, req, rs).ratio() > 0.7:
                partially_matched.add(req)
                break

    match_score = 0
    if all_required:
        weighted_score = len(matched & mandatory_skills) * 2 + len(matched & preferred_skills)
        max_score = len(mandatory_skills) * 2 + len(preferred_skills)
        match_score = round((weighted_score / max_score) * 100) if max_score > 0 else 0

    suggestions = []
    for skill in missing:
        if skill in mandatory_skills:
            suggestions.append(f"Add '{skill}' to your resume - this is a mandatory requirement")
        elif skill in preferred_skills:
            suggestions.append(f"Consider adding '{skill}' - this is a preferred skill")

    for skill in partially_matched:
        suggestions.append(f"Clarify your experience with '{skill}' - partially matched")

    return Response({
        'match_percentage': match_score,
        'matched_skills': list(matched),
        'missing_skills': list(missing),
        'partially_matched_skills': list(partially_matched),
        'mandatory_matched': list(matched & mandatory_skills),
        'preferred_matched': list(matched & preferred_skills),
        'suggestions': suggestions,
        'resume_title': resume.title,
        'job_title': job.title,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def resume_skills(request, resume_id):
    try:
        resume = Resume.objects.get(id=resume_id, user=request.user)
    except Resume.DoesNotExist:
        return Response({'error': 'Resume not found'}, status=status.HTTP_404_NOT_FOUND)

    if not resume.extracted_text:
        return Response({'error': 'Resume text not extracted yet'}, status=status.HTTP_400_BAD_REQUEST)

    skills = extract_skills(resume.extracted_text)
    return Response({'skills': list(skills), 'resume_title': resume.title})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def job_skills(request, job_id):
    try:
        job = JobDescription.objects.get(id=job_id, user=request.user)
    except JobDescription.DoesNotExist:
        return Response({'error': 'Job Description not found'}, status=status.HTTP_404_NOT_FOUND)

    mandatory = set(s.strip().lower() for s in job.mandatory_skills.split(',') if s.strip())
    preferred = set(s.strip().lower() for s in job.preferred_skills.split(',') if s.strip())
    return Response({
        'mandatory_skills': list(mandatory),
        'preferred_skills': list(preferred),
        'experience_requirements': job.experience_requirements.split('\n') if job.experience_requirements else [],
        'job_title': job.title,
    })