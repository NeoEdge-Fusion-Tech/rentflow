from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Avg, Count, Max, Q
from django.shortcuts import get_object_or_404

from .models import FeedbackAnswer, FeedbackForm, ProjectFeedback, FeedbackResponse
from .serializers import (
    FeedbackFormSerializer,
    ProjectFeedbackSerializer,
    FeedbackResponseSerializer,
)


class FeedbackFormViewSet(viewsets.ModelViewSet):
    serializer_class = FeedbackFormSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            FeedbackForm.objects.filter(organization=self.request.user.organization)
            .prefetch_related("questions")
            .annotate(
                project_count=Count("project_links__event", distinct=True),
                response_count=Count("project_links__responses", distinct=True),
                last_response_at=Max("project_links__responses__submitted_at"),
                average_rating=Avg(
                    "project_links__responses__answers__answer_rating",
                    filter=Q(
                        project_links__responses__answers__question__question_type="RATING"
                    ),
                ),
            )
        )

    def _form_responses(self, form):
        qs = FeedbackResponse.objects.filter(project_feedback__form=form)
        event = self.request.query_params.get("event")
        if event:
            qs = qs.filter(project_feedback__event_id=event)
        return qs

    @action(detail=True, methods=["get"])
    def summary(self, request, pk=None):
        """Statistics for a form across every project it's used on
        (or one project with ?event=), plus a per-project breakdown."""
        form = self.get_object()
        data = feedback_summary(form.questions.all(), self._form_responses(form))
        by_project = []
        links = (
            ProjectFeedback.objects.filter(form=form)
            .select_related("event")
            .annotate(
                response_count=Count("responses", distinct=True),
                last_response_at=Max("responses__submitted_at"),
                average_rating=Avg(
                    "responses__answers__answer_rating",
                    filter=Q(responses__answers__question__question_type="RATING"),
                ),
            )
            .order_by("-last_response_at", "-created_at")
        )
        for link in links:
            ratings = list(
                FeedbackAnswer.objects.filter(
                    response__project_feedback=link,
                    question__question_type="RATING",
                    answer_rating__isnull=False,
                ).values_list("answer_rating", flat=True)
            )
            by_project.append(
                {
                    "project_feedback_id": link.id,
                    "event_id": link.event_id,
                    "event_name": link.event.name,
                    "responses": link.response_count,
                    "average_rating": (
                        round(float(link.average_rating), 2)
                        if link.average_rating is not None
                        else None
                    ),
                    "satisfaction": (
                        round(100 * sum(1 for r in ratings if r >= 4) / len(ratings))
                        if ratings
                        else None
                    ),
                    "last_response_at": link.last_response_at,
                }
            )
        data["by_project"] = by_project
        return Response(data)

    @action(detail=True, methods=["get"])
    def responses(self, request, pk=None):
        form = self.get_object()
        qs = (
            self._form_responses(form)
            .select_related("project_feedback__event")
            .prefetch_related("answers")
            .order_by("-submitted_at")
        )
        return Response(FeedbackResponseSerializer(qs, many=True).data)


class ProjectFeedbackViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
            ProjectFeedback.objects.filter(
                event__organization=self.request.user.organization
            )
            .select_related("form", "event")
            .prefetch_related("form__questions")
            .annotate(
                response_count=Count("responses", distinct=True),
                last_response_at=Max("responses__submitted_at"),
                average_rating=Avg(
                    "responses__answers__answer_rating",
                    filter=Q(responses__answers__question__question_type="RATING"),
                ),
            )
            .order_by("created_at")
        )
        event = self.request.query_params.get("event")
        if event:
            qs = qs.filter(event_id=event)
        return qs

    @action(detail=True, methods=["get"])
    def responses(self, request, pk=None):
        project_feedback = self.get_object()
        responses = (
            FeedbackResponse.objects.filter(project_feedback=project_feedback)
            .prefetch_related("answers")
            .order_by("-submitted_at")
        )
        serializer = FeedbackResponseSerializer(responses, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def summary(self, request, pk=None):
        """Per-question statistics for one form on one project."""
        pf = self.get_object()
        return Response(
            feedback_summary(
                pf.form.questions.all(),
                FeedbackResponse.objects.filter(project_feedback=pf),
            )
        )


def feedback_summary(form_questions, responses):
    """Per-question statistics for a set of responses to one form."""
    total = responses.count()
    answers = FeedbackAnswer.objects.filter(response__in=responses)

    questions = []
    all_ratings = []
    for q in form_questions:
        qa = answers.filter(question=q)
        item = {
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "answered": 0,
        }
        if q.question_type == "RATING":
            ratings = [r for r in qa.values_list("answer_rating", flat=True) if r]
            all_ratings += ratings
            item["answered"] = len(ratings)
            item["average"] = round(sum(ratings) / len(ratings), 2) if ratings else None
            item["distribution"] = {str(n): ratings.count(n) for n in range(1, 6)}
        elif q.question_type == "BOOLEAN":
            vals = [
                v for v in qa.values_list("answer_boolean", flat=True) if v is not None
            ]
            item["answered"] = len(vals)
            item["yes"] = sum(1 for v in vals if v)
            item["no"] = sum(1 for v in vals if not v)
        elif q.question_type in ("RADIO", "CHECKBOX"):
            counts = {str(o): 0 for o in (q.options or [])}
            answered = 0
            for a in qa:
                picked = a.answer_choices
                if picked in (None, "", []):
                    picked = [a.answer_text] if a.answer_text else []
                if not isinstance(picked, list):
                    picked = [picked]
                if picked:
                    answered += 1
                for c in picked:
                    counts[str(c)] = counts.get(str(c), 0) + 1
            item["answered"] = answered
            item["options"] = [{"label": k, "count": v} for k, v in counts.items()]
        else:  # TEXT
            texts = (
                qa.exclude(answer_text__isnull=True)
                .exclude(answer_text="")
                .select_related("response")
                .order_by("-response__submitted_at")
            )
            item["answered"] = texts.count()
            item["answers"] = [
                {
                    "response_id": a.response_id,
                    "text": a.answer_text,
                    "client_name": a.response.client_name,
                    "submitted_at": a.response.submitted_at,
                }
                for a in texts[:200]
            ]
        questions.append(item)

    # Responses per day, for the trend sparkline.
    by_day = {}
    for d in responses.values_list("submitted_at", flat=True):
        key = d.date().isoformat()
        by_day[key] = by_day.get(key, 0) + 1

    return {
        "total_responses": total,
        "average_rating": (
            round(sum(all_ratings) / len(all_ratings), 2) if all_ratings else None
        ),
        # Share of ratings that are 4 or 5 stars.
        "satisfaction": (
            round(100 * sum(1 for r in all_ratings if r >= 4) / len(all_ratings))
            if all_ratings
            else None
        ),
        "first_response_at": responses.order_by("submitted_at")
        .values_list("submitted_at", flat=True)
        .first(),
        "last_response_at": responses.order_by("-submitted_at")
        .values_list("submitted_at", flat=True)
        .first(),
        "by_day": [{"date": k, "count": v} for k, v in sorted(by_day.items())],
        "questions": questions,
    }


class PublicFeedbackViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def retrieve(self, request, pk=None):
        """Fetch form details by UUID (pk is UUID)"""
        project_feedback = get_object_or_404(
            ProjectFeedback, public_id=pk, is_active=True
        )
        serializer = ProjectFeedbackSerializer(project_feedback)
        return Response(serializer.data)

    def create(self, request):
        """Submit a response"""
        serializer = FeedbackResponseSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
