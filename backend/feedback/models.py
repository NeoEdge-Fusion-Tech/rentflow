import uuid
from django.db import models
from django.conf import settings
from users.models import Organization

class FeedbackForm(models.Model):
    id = models.AutoField(primary_key=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='feedback_forms')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class FeedbackQuestion(models.Model):
    QUESTION_TYPES = (
        ('TEXT', 'Text'),
        ('RATING', 'Rating'),
        ('BOOLEAN', 'Yes/No'),
        ('RADIO', 'Single Choice (Radio)'),
        ('CHECKBOX', 'Multiple Choice (Checkbox)'),
    )
    id = models.AutoField(primary_key=True)
    form = models.ForeignKey(FeedbackForm, on_delete=models.CASCADE, related_name='questions')
    question_text = models.CharField(max_length=500)
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='TEXT')
    options = models.JSONField(blank=True, null=True, help_text="List of choices for RADIO and CHECKBOX types")
    position = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['position']

    def __str__(self):
        return self.question_text

class ProjectFeedback(models.Model):
    id = models.AutoField(primary_key=True)
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='feedbacks')
    form = models.ForeignKey(FeedbackForm, on_delete=models.CASCADE, related_name='project_links')
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event.name} - {self.form.title}"

class FeedbackResponse(models.Model):
    id = models.AutoField(primary_key=True)
    project_feedback = models.ForeignKey(ProjectFeedback, on_delete=models.CASCADE, related_name='responses')
    client_name = models.CharField(max_length=255, blank=True, null=True)
    client_email = models.EmailField(blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Response to {self.project_feedback.event.name} by {self.client_name or 'Anonymous'}"

class FeedbackAnswer(models.Model):
    id = models.AutoField(primary_key=True)
    response = models.ForeignKey(FeedbackResponse, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(FeedbackQuestion, on_delete=models.CASCADE)
    answer_text = models.TextField(blank=True, null=True)
    answer_rating = models.IntegerField(blank=True, null=True)
    answer_boolean = models.BooleanField(blank=True, null=True)
    answer_choices = models.JSONField(blank=True, null=True)

    def __str__(self):
        return f"Answer to {self.question.question_text}"
