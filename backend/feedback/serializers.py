from rest_framework import serializers
from .models import (
    FeedbackForm,
    FeedbackQuestion,
    ProjectFeedback,
    FeedbackResponse,
    FeedbackAnswer,
)
from events.models import Event


class FeedbackQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackQuestion
        fields = [
            "id",
            "question_text",
            "question_type",
            "options",
            "is_required",
            "position",
        ]


class FeedbackFormSerializer(serializers.ModelSerializer):
    # Usage stats, filled by FeedbackFormViewSet's annotations.
    project_count = serializers.SerializerMethodField()
    response_count = serializers.SerializerMethodField()
    last_response_at = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()

    def get_project_count(self, obj):
        return getattr(obj, "project_count", None)

    def get_response_count(self, obj):
        return getattr(obj, "response_count", None)

    def get_last_response_at(self, obj):
        return getattr(obj, "last_response_at", None)

    def get_average_rating(self, obj):
        avg = getattr(obj, "average_rating", None)
        return round(float(avg), 2) if avg is not None else None

    questions = FeedbackQuestionSerializer(many=True, required=False)

    class Meta:
        model = FeedbackForm
        fields = [
            "id",
            "title",
            "description",
            "questions",
            "created_at",
            "updated_at",
            "project_count",
            "response_count",
            "last_response_at",
            "average_rating",
        ]

    def create(self, validated_data):
        questions_data = validated_data.pop("questions", [])
        validated_data["organization"] = self.context["request"].user.organization
        form = FeedbackForm.objects.create(**validated_data)
        for q_data in questions_data:
            FeedbackQuestion.objects.create(form=form, **q_data)
        return form

    def update(self, instance, validated_data):
        questions_data = validated_data.pop("questions", None)
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.save()

        if questions_data is not None:
            # Simple approach: delete old questions and create new ones
            instance.questions.all().delete()
            for q_data in questions_data:
                FeedbackQuestion.objects.create(form=instance, **q_data)

        return instance


class ProjectFeedbackSerializer(serializers.ModelSerializer):
    form = FeedbackFormSerializer(read_only=True)
    form_id = serializers.PrimaryKeyRelatedField(
        queryset=FeedbackForm.objects.all(), source="form", write_only=True
    )
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(), source="event", write_only=True
    )

    event_details = serializers.SerializerMethodField()
    # Filled by ProjectFeedbackViewSet's annotations (absent on public reads).
    response_count = serializers.IntegerField(read_only=True, required=False)
    last_response_at = serializers.DateTimeField(read_only=True, required=False)
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = ProjectFeedback
        fields = [
            "id",
            "event_id",
            "form",
            "form_id",
            "public_id",
            "is_active",
            "created_at",
            "event_details",
            "response_count",
            "last_response_at",
            "average_rating",
        ]

    def get_average_rating(self, obj):
        avg = getattr(obj, "average_rating", None)
        return round(float(avg), 2) if avg is not None else None

    def get_event_details(self, obj):
        logo = obj.event.organization.company_logo
        logo_url = logo.url if logo else None

        request = self.context.get("request")
        if logo_url and not logo_url.startswith("http") and request:
            logo_url = request.build_absolute_uri(logo_url)

        event_date = None
        first_invoice = obj.event.invoices.first()
        if first_invoice and first_invoice.event_date:
            event_date = first_invoice.event_date
        elif obj.event.end_date:
            event_date = obj.event.end_date
        else:
            event_date = obj.event.start_date

        return {
            "name": obj.event.name,
            "start_date": obj.event.start_date,
            "end_date": obj.event.end_date,
            "event_date": event_date,
            "organization_logo": logo_url,
            "organization_name": obj.event.organization.name,
        }


class FeedbackAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackAnswer
        fields = [
            "question",
            "answer_text",
            "answer_rating",
            "answer_boolean",
            "answer_choices",
        ]


class FeedbackResponseSerializer(serializers.ModelSerializer):
    answers = FeedbackAnswerSerializer(many=True)
    event_id = serializers.IntegerField(
        source="project_feedback.event_id", read_only=True
    )
    event_name = serializers.CharField(
        source="project_feedback.event.name", read_only=True
    )

    class Meta:
        model = FeedbackResponse
        fields = [
            "id",
            "project_feedback",
            "client_name",
            "client_email",
            "submitted_at",
            "answers",
            "event_id",
            "event_name",
        ]
        read_only_fields = ["id", "submitted_at"]

    def create(self, validated_data):
        answers_data = validated_data.pop("answers", [])
        response = FeedbackResponse.objects.create(**validated_data)
        for answer_data in answers_data:
            FeedbackAnswer.objects.create(response=response, **answer_data)
        return response
