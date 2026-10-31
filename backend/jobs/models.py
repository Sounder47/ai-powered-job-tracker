
from django.conf import settings
from django.db import models


class JobApplication(models.Model):
    class Status(models.TextChoices):
        SAVED = "saved", "Saved"
        APPLIED = "applied", "Applied"
        ASSESSMENT = "assessment", "Assessment"
        INTERVIEW = "interview", "Interview"
        OFFER = "offer", "Offer"
        REJECTED = "rejected", "Rejected"
        WITHDRAWN = "withdrawn", "Withdrawn"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_applications",
    )
    company = models.CharField(max_length=200)
    job_title = models.CharField(max_length=200)
    job_url = models.URLField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    employment_type = models.CharField(max_length=50, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SAVED,
    )
    applied_date = models.DateField(null=True, blank=True)
    follow_up_date = models.DateField(null=True, blank=True)    
    salary = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.job_title} at {self.company}"



class ApplicationActivity(models.Model):
    class ActivityType(models.TextChoices):
        CREATED = "created", "Application created"
        STATUS_CHANGED = "status_changed", "Status changed"
        NOTE_ADDED = "note_added", "Note added"
        UPDATED = "updated", "Application updated"

    application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    activity_type = models.CharField(
        max_length=30,
        choices=ActivityType.choices,
    )
    description = models.TextField()
    old_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.application} - {self.get_activity_type_display()}"
