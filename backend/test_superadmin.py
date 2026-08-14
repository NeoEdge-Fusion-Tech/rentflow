import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from users.views import SuperAdminStatsAPIView
from users.models import User
from rest_framework.test import APIRequestFactory

factory = APIRequestFactory()
request = factory.get("/users/superadmin/stats/")
request.user = User.objects.filter(is_superuser=True).first()

if not request.user:
    print("No superuser found. Using a dummy user.")
    request.user = User(is_superuser=True, role="admin")

view = SuperAdminStatsAPIView.as_view()

try:
    # Just instantiate and call get directly to bypass permission checks
    v = SuperAdminStatsAPIView()
    v.request = request
    v.format_kwarg = None
    response = v.get(request)
    print("STATUS:", getattr(response, "status_code", 200))
    print("DATA:", response.data)
except Exception as e:
    import traceback

    traceback.print_exc()
