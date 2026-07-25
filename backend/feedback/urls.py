from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeedbackFormViewSet, ProjectFeedbackViewSet, PublicFeedbackViewSet

router = DefaultRouter()
router.register(r'forms', FeedbackFormViewSet, basename='feedback-forms')
router.register(r'project-feedbacks', ProjectFeedbackViewSet, basename='project-feedbacks')
router.register(r'public', PublicFeedbackViewSet, basename='public-feedback')

urlpatterns = [
    path('', include(router.urls)),
]
