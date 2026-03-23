import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from rest_framework import status
from inventory.views import ProductViewSet
from users.models import Organization

# Get an organization (should be at least one)
org = Organization.objects.first()
if not org:
    print("No organization found")
    exit()

factory = APIRequestFactory()
view = ProductViewSet.as_view({'get': 'list'})

# Construct a simple request
request = factory.get('/api/inventory/products/')
# Mock the organization (tenant isolation usually uses request.organization or something similar)
request.organization = org

try:
    response = view(request)
    print("Status Code:", response.status_code)
    if response.status_code != 200:
        print("Response Data:", response.data)
    else:
        print("Success! Count:", len(response.data))
        for item in response.data:
            print(f"Product: {item.get('name')}, Units: {len(item.get('units', []))}")
except Exception as e:
    print("ERROR during fetch:")
    import traceback
    traceback.print_exc()
