from rest_framework import serializers
from .models import FeedbackForm, FeedbackQuestion, ProjectFeedback, FeedbackResponse, FeedbackAnswer
from events.models import Event

class FeedbackQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackQuestion
        fields = ['id', 'question_text', 'question_type', 'position']

class FeedbackFormSerializer(serializers.ModelSerializer):
    questions = FeedbackQuestionSerializer(many=True, required=False)

    class Meta:
        model = FeedbackForm
        fields = ['id', 'title', 'description', 'questions', 'created_at', 'updated_at']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        validated_data['organization'] = self.context['request'].user.organization
        form = FeedbackForm.objects.create(**validated_data)
        for q_data in questions_data:
            FeedbackQuestion.objects.create(form=form, **q_data)
        return form

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
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
        queryset=FeedbackForm.objects.all(), source='form', write_only=True
    )
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(), source='event', write_only=True
    )
    
    class Meta:
        model = ProjectFeedback
        fields = ['id', 'event_id', 'form', 'form_id', 'public_id', 'is_active', 'created_at']

class FeedbackAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackAnswer
        fields = ['question', 'answer_text', 'answer_rating', 'answer_boolean']

class FeedbackResponseSerializer(serializers.ModelSerializer):
    answers = FeedbackAnswerSerializer(many=True)

    class Meta:
        model = FeedbackResponse
        fields = ['id', 'project_feedback', 'client_name', 'client_email', 'submitted_at', 'answers']
        read_only_fields = ['id', 'submitted_at']

    def create(self, validated_data):
        answers_data = validated_data.pop('answers', [])
        response = FeedbackResponse.objects.create(**validated_data)
        for answer_data in answers_data:
            FeedbackAnswer.objects.create(response=response, **answer_data)
        return response
