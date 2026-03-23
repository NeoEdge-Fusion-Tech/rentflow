from rest_framework import viewsets, filters
from rest_framework.views import APIView
from rest_framework import permissions
from rest_framework.decorators import action
from django.utils import timezone
from .models import OTP
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from inventory.models import Booking
import django_filters.rest_framework as django_filters
from .models import Organization, Subscription, OrganizationAccountDetails, User, Client, Currency
from .serializers import OrganizationSerializer, SubscriptionSerializer, OrganizationAccountDetailsSerializer, UserSerializer, ClientSerializer, RegisterSerializer, VerifyOTPSerializer, SetNewPasswordSerializer, AdminChangePasswordSerializer, CurrencySerializer
from users.mixins import TenantIsolationMixin
from .utils import send_verification_email, send_password_reset_email
from rest_framework import status
from payment.models import Payment

class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    def patch(self, request):
        return self.put(request)
        
    def delete(self, request):
        user = request.user
        user.delete()
        return Response({"message": "Account deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

class RegisterAPIView(APIView):
    permission_classes = [] 
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            send_verification_email(user)
            return Response({
                "message": "Registration successful. Please check your email for the verification code.",
                "user_id": user.id,
                "email": user.email
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyEmailAPIView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            code = serializer.validated_data['code']
            try:
                user = User.objects.get(email=email)
                otp = OTP.objects.filter(user=user, code=code, purpose='email_verification', is_used=False, expires_at__gt=timezone.now()).first()
                if otp:
                    otp.is_used = True
                    otp.save()
                    user.email_verified = True
                    user.save()
                    return Response({"message": "Email verified successfully."}, status=status.HTTP_200_OK)
                return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
            except User.DoesNotExist:
                return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TriggerPasswordResetAPIView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            send_password_reset_email(user)
            return Response({"message": "Password reset OTP sent to email."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"message": "If an account with that email exists, an OTP has been sent."}, status=status.HTTP_200_OK)

class SetNewPasswordAPIView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = SetNewPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            code = serializer.validated_data['code']
            new_password = serializer.validated_data['new_password']
            try:
                user = User.objects.get(email=email)
                otp = OTP.objects.filter(user=user, code=code, purpose='password_reset', is_used=False, expires_at__gt=timezone.now()).first()
                if otp:
                    user.set_password(new_password)
                    user.save()
                    otp.is_used = True
                    otp.save()
                    return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)
                return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
            except User.DoesNotExist:
                return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OrganizationViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer

class SubscriptionViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer

class OrganizationAccountDetailsViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = OrganizationAccountDetails.objects.all()
    serializer_class = OrganizationAccountDetailsSerializer

class UserViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def admin_change_password(self, request, pk=None):
        user_to_modify = self.get_object()
        if request.user.role != 'admin':
            return Response({"error": "Only organization admins can change passwords."}, status=status.HTTP_403_FORBIDDEN)
        if request.user == user_to_modify:
            return Response({"error": "Use your profile to change your own password."}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = AdminChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user_to_modify.set_password(serializer.validated_data['new_password'])
            user_to_modify.save()
            return Response({"message": "User password updated successfully."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def admin_trigger_reset(self, request, pk=None):
        user_to_modify = self.get_object()
        if request.user.role != 'admin':
            return Response({"error": "Only organization admins can trigger reset."}, status=status.HTTP_403_FORBIDDEN)
        send_password_reset_email(user_to_modify)
        return Response({"message": "Password reset email sent to user."})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def deactivate(self, request, pk=None):
        user_to_modify = self.get_object()
        if request.user.role != 'admin':
            return Response({"error": "Only organization admins can deactivate users."}, status=status.HTTP_403_FORBIDDEN)
        if request.user == user_to_modify:
            return Response({"error": "You cannot deactivate yourself."}, status=status.HTTP_400_BAD_REQUEST)
        
        user_to_modify.is_active = not user_to_modify.is_active
        user_to_modify.save()
        status_text = "activated" if user_to_modify.is_active else "deactivated"
        return Response({"message": f"User {status_text} safely.", "is_active": user_to_modify.is_active})

    def destroy(self, request, *args, **kwargs):
        user_to_modify = self.get_object()
        if request.user == user_to_modify:
            return Response({"error": "You cannot delete yourself from the team dashboard. Use your profile settings."}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

class ClientViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filter_backends = [django_filters.DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status']
    search_fields = ['first_name', 'last_name', 'email', 'phone_number', 'company_name']

    def get_queryset(self):
        return super().get_queryset().annotate(bookings_count=Count('bookings'))

class SuperAdminStatsAPIView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        total_orgs = Organization.objects.count()
        total_users = User.objects.count()
        
        # Total Platform Revenue
        platform_revenue_agg = Payment.objects.filter(status='completed').aggregate(total=Sum('amount'))
        platform_revenue = platform_revenue_agg['total'] or 0
        
        # Global booking volume
        active_bookings = Booking.objects.exclude(status__in=['returned', 'cancelled']).count()
        
        # Chart Data (Last 6 Months)
        today = timezone.now()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        from dateutil.relativedelta import relativedelta
        
        chart_data = []
        for i in range(5, -1, -1):
            start = start_of_month - relativedelta(months=i)
            end = start + relativedelta(months=1)
            b_count = Booking.objects.filter(
                created_at__gte=start,
                created_at__lt=end
            ).count()

            p_agg = Payment.objects.filter(
                payment_date__gte=start,
                payment_date__lt=end,
                status='completed'
            ).aggregate(total_rev=Sum('amount'))
            
            chart_data.append({
                'name': start.strftime('%b'),
                'revenue': float(p_agg['total_rev'] or 0),
                'bookings': b_count
            })

        # Recent Activity (Global)
        recent_activity = []
        recent_bookings = Booking.objects.select_related('organization').order_by('-updated_at')[:5]
        for b in recent_bookings:
            recent_activity.append({
                'title': f"[{b.organization.name}] Booking #{b.booking_id} {b.get_status_display()}",
                'time': b.updated_at.strftime("%I:%M %p"),
                'type': 'booking'
            })

        # Top Organizations Overview
        top_orgs_qs = Organization.objects.annotate(
            total_bookings=Count('bookings', distinct=True),
            revenue=Sum('bookings__payments__amount', filter=Q(bookings__payments__status='completed'))
        ).order_by('-total_bookings')[:10]
        
        orgs_overview = []
        for org in top_orgs_qs:
            orgs_overview.append({
                'id': org.id,
                'name': org.name,
                'total_bookings': org.total_bookings,
                'revenue': float(org.revenue or 0),
                'currency_symbol': org.currency.symbol if org.currency else '$'
            })
        
        return Response({
            'total_organizations': total_orgs,
            'total_users': total_users,
            'platform_revenue': float(platform_revenue),
            'active_bookings': active_bookings,
            'chart_data': chart_data,
            'recent_activity': recent_activity,
            'organizations_overview': orgs_overview,
        })

class SuperAdminOrganizationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAdminUser]
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    filter_backends = [django_filters.DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name']
    ordering_fields = ['created_at', 'name']

    def get_queryset(self):
        from django.db.models import Sum, Q, Count
        # Exclude deleted organizations by default unless specifically requested
        qs = super().get_queryset()
        if self.request.query_params.get('include_deleted') != 'true':
            qs = qs.filter(is_deleted=False)
            
        qs = qs.annotate(
            total_bookings=Count('bookings', distinct=True),
            revenue=Sum('bookings__payments__amount', filter=Q(bookings__payments__status='completed'))
        )
        return qs

    def perform_destroy(self, instance):
        timestamp = timezone.now().strftime("%Y%m%d%H%M%S")
        instance.is_deleted = True
        instance.is_active = False
        instance.deleted_at = timezone.now()
        instance.name = f"{instance.name}_deleted_{timestamp}"
        instance.save()
        
        # Soft delete users associated with the organization and free up their emails
        for user in instance.users.all():
            user.is_deleted = True
            user.is_active = False
            user.deleted_at = timezone.now()
            user.email = f"deleted_{timestamp}_{user.email}"
            user.save()

class SuperAdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filter_backends = [django_filters.DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['organization', 'role', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'username']

class CurrencyViewSet(viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    filter_backends = [django_filters.DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status']
    search_fields = ['name', 'code']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return []
        return [IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('all') != 'true':
            qs = qs.filter(status='active')
        return qs
