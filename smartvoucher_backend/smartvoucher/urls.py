from django.contrib import admin
from django.conf import settings
from django.urls import path, include
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from orders.views import ProductDetailAPIView, ProductListCreateAPIView
from .health import health_check

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/products/", ProductListCreateAPIView.as_view()),
    path("api/products/<int:product_id>/", ProductDetailAPIView.as_view()),
    path("api/orders/", include("orders.urls")),
    path('api/vouchers/', include('vouchers.urls')),
    path("api/users/login/", TokenObtainPairView.as_view()),
    path("api/users/refresh/", TokenRefreshView.as_view()),
    path("api/users/", include("users.urls")),
    path("health/", health_check, name="health_check"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
