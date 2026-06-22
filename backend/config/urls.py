from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from django.http import HttpResponse

def api_home(request):
    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Neo Inventory API</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #050810; color: #F1F5F9; }
            .container { text-align: center; padding: 3rem; background: #0D121F; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); border: 1px solid #1E293B; }
            h1 { color: #FFA652; margin-bottom: 1rem; font-size: 2rem; }
            p { color: #94A3B8; font-size: 1.1rem; margin-bottom: 2rem; }
            .status { display: inline-block; padding: 0.5rem 1rem; background: rgba(34, 197, 94, 0.1); color: #22c55e; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; border: 1px solid rgba(34, 197, 94, 0.2); }
            .pulse { display: inline-block; width: 8px; height: 8px; background-color: #22c55e; border-radius: 50%; margin-right: 8px; animation: pulse 2s infinite; }
            @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }
            a { color: #FFA652; text-decoration: none; font-weight: 500; }
            a:hover { text-decoration: underline; }
            .links { margin-top: 2rem; font-size: 0.9rem; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Neo Inventory API</h1>
            <p>The backend systems are fully operational.</p>
            <div class="status"><span class="pulse"></span> API is Live</div>
            <div class="links">
                <a href="/api/docs/">View API Documentation</a>
            </div>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html)

urlpatterns = [
    path('', api_home, name='home'),
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/notification/', include('notification.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/payment/', include('payment.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
