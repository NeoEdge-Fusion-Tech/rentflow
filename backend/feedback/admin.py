from django.contrib import admin
from .models import (
    FeedbackForm,
    FeedbackQuestion,
    ProjectFeedback,
    FeedbackResponse,
    FeedbackAnswer,
)


class FeedbackQuestionInline(admin.TabularInline):
    model = FeedbackQuestion
    extra = 1
    fields = ("position", "question_text", "question_type")
    ordering = ("position",)


@admin.register(FeedbackForm)
class FeedbackFormAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "created_at", "updated_at")
    list_filter = ("organization", "created_at")
    search_fields = ("title", "organization__name")
    inlines = [FeedbackQuestionInline]
    date_hierarchy = "created_at"


@admin.register(ProjectFeedback)
class ProjectFeedbackAdmin(admin.ModelAdmin):
    list_display = ("id", "event", "form", "public_id", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("event__name", "form__title", "public_id")
    readonly_fields = ("public_id", "created_at")


class FeedbackAnswerInline(admin.TabularInline):
    model = FeedbackAnswer
    extra = 0
    readonly_fields = ("question", "answer_text", "answer_rating", "answer_boolean")
    can_delete = False


@admin.register(FeedbackResponse)
class FeedbackResponseAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "project_feedback",
        "client_name",
        "client_email",
        "submitted_at",
    )
    list_filter = ("submitted_at", "project_feedback__event__organization")
    search_fields = ("client_name", "client_email", "project_feedback__event__name")
    readonly_fields = ("submitted_at",)
    inlines = [FeedbackAnswerInline]
    date_hierarchy = "submitted_at"


@admin.register(FeedbackQuestion)
class FeedbackQuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "form", "question_text", "question_type", "position")
    list_filter = ("question_type",)
    search_fields = ("question_text", "form__title")
    ordering = ("form", "position")


@admin.register(FeedbackAnswer)
class FeedbackAnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "response", "question")
    search_fields = (
        "response__client_name",
        "response__client_email",
        "question__question_text",
    )
