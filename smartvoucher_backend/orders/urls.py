from django.urls import path

from .views import (
    AdminOrdersAPIView,
    CancelOrderAPIView,
    MyOrdersAPIView,
    SyncOrderAPIView,
)

urlpatterns = [
    path("admin/", AdminOrdersAPIView.as_view()),
    path("mine/", MyOrdersAPIView.as_view()),
    path("sync/", SyncOrderAPIView.as_view()),
    path("cancel/", CancelOrderAPIView.as_view()),
]
