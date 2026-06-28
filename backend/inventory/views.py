from django.db import models
from rest_framework import viewsets, permissions, filters, status
from .permissions import HasPaidSubscription
from rest_framework.decorators import action
from rest_framework.response import Response
import django_filters.rest_framework as django_filters
from .models import ProductCategory, Product, ProductUnit, Booking, BookingItem, BookingItemUnit
from .serializers import (
    ProductCategorySerializer, ProductSerializer, ProductUnitSerializer,
    BookingSerializer, BookingItemSerializer, BookingItemUnitSerializer,
    ProductAvailabilitySerializer
)
from django.utils.dateparse import parse_datetime
import datetime
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from django.db.models import Sum, Q, Count, F
from rest_framework.views import APIView
from rest_framework.response import Response
from users.models import Client
from users.mixins import TenantIsolationMixin
from payment.models import Payment

class ProductCategoryViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasPaidSubscription]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('all') != 'true':
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {'created_by': user, 'updated_by': user}
        if not user.is_superuser:
            kwargs['organization'] = user.organization
        serializer.save(**kwargs)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.products.exists():
            return Response(
                {"error": "Cannot delete this category because it contains products. Remove or reassign them first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

class ProductViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated, HasPaidSubscription]
    filter_backends = [django_filters.DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'slug', 'description']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('all') != 'true':
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {'created_by': user, 'updated_by': user}
        if not user.is_superuser:
            kwargs['organization'] = user.organization
        serializer.save(**kwargs)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=['get'])
    def availability(self, request, pk=None):
        product = self.get_object()
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        exclude_booking_id = request.query_params.get('exclude_booking_id')
        
        if not start_date_str or not end_date_str:
            return Response({"error": "start_date and end_date are required."}, status=400)
            
        try:
            start_date = parse_datetime(start_date_str)
            end_date = parse_datetime(end_date_str)
        except Exception:
            return Response({"error": "Invalid date format. Use ISO format."}, status=400)

        if not start_date or not end_date:
            return Response({"error": "Invalid date format."}, status=400)

        available_qty = product.get_availability(start_date, end_date, exclude_booking_id=exclude_booking_id)
        available_units = product.get_available_units(start_date, end_date, exclude_booking_id=exclude_booking_id)
        
        # If excluding a booking, we want to know the fulfillment of units already in that booking
        booking_units_stats = {}
        if exclude_booking_id:
            from .models import BookingItemUnit
            bus = BookingItemUnit.objects.filter(booking_item__booking_id=exclude_booking_id)
            for bu in bus:
                booking_units_stats[bu.product_unit_id] = {
                    "quantity_picked_up": bu.quantity_picked_up,
                    "quantity_returned_good": bu.quantity_returned_good,
                    "quantity_returned_damaged": bu.quantity_returned_damaged
                }

        data = {
            "product_id": product.product_id,
            "start_date": start_date,
            "end_date": end_date,
            "available_quantity": available_qty,
            "total_good_condition": product.total_quantity_good_condition,
            "available_units": [
                {
                    "product_unit_id": u.product_unit_id,
                    "serial_number": u.serial_number,
                    "name": u.name or u.serial_number,
                    "quantity_picked_up": booking_units_stats.get(u.product_unit_id, {}).get("quantity_picked_up", 0),
                    "quantity_returned_good": booking_units_stats.get(u.product_unit_id, {}).get("quantity_returned_good", 0),
                    "quantity_returned_damaged": booking_units_stats.get(u.product_unit_id, {}).get("quantity_returned_damaged", 0)
                } for u in available_units
            ]
        }
        return Response(data)

class ProductUnitViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = ProductUnit.objects.all()
    serializer_class = ProductUnitSerializer
    permission_classes = [permissions.IsAuthenticated, HasPaidSubscription]
    
    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('all') != 'true':
            qs = qs.filter(product__is_active=True)
        return qs

class BookingFilter(django_filters.FilterSet):
    pickup_after = django_filters.DateTimeFilter(field_name="pickup_date", lookup_expr='gte')
    pickup_before = django_filters.DateTimeFilter(field_name="pickup_date", lookup_expr='lte')
    return_after = django_filters.DateTimeFilter(field_name="return_date", lookup_expr='gte')
    return_before = django_filters.DateTimeFilter(field_name="return_date", lookup_expr='lte')

    class Meta:
        model = Booking
        fields = ['status', 'payment_status', 'delivery_mode', 'client']

class BookingViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, HasPaidSubscription]
    filter_backends = [django_filters.DjangoFilterBackend, filters.SearchFilter]
    filterset_class = BookingFilter
    search_fields = ['event_location', 'contact_name', 'client__first_name', 'client__last_name', 'booking_id']

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser and hasattr(user, 'organization') and user.organization:
            org = user.organization
            # Check quota if not on an active paid plan
            if hasattr(org, 'subscription') and org.subscription and org.subscription.status != 'active':
                from django.conf import settings
                from django.utils import timezone
                from rest_framework.exceptions import PermissionDenied
                
                quota = getattr(settings, 'FREE_TIER_MONTHLY_QUOTA', 10)
                now = timezone.now()
                current_month_bookings = Booking.objects.filter(
                    organization=org,
                    created_at__year=now.year,
                    created_at__month=now.month
                ).count()
                
                if current_month_bookings >= quota:
                    raise PermissionDenied(f"You have reached your free tier limit of {quota} bookings per month. Please upgrade your plan to continue.")

        kwargs = {'created_by': user, 'updated_by': user}
        if not user.is_superuser:
            kwargs['organization'] = user.organization
        serializer.save(**kwargs)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

class BookingItemViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = BookingItem.objects.all()
    serializer_class = BookingItemSerializer
    permission_classes = [permissions.IsAuthenticated, HasPaidSubscription]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

class BookingItemUnitViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = BookingItemUnit.objects.all()
    serializer_class = BookingItemUnitSerializer
    permission_classes = [permissions.IsAuthenticated, HasPaidSubscription]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

class TenantStatsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasPaidSubscription]
    def get(self, request):
        user = request.user
        
        # Super admin can optionally query stats for a specific organization
        if user.is_superuser:
            org_id = request.query_params.get('organization')
            if org_id:
                from users.models import Organization
                try:
                    organization = Organization.objects.get(id=org_id)
                except Organization.DoesNotExist:
                    return Response({'error': 'Organization not found'}, status=404)
            else:
                # If superuser and no organization specified, return an error or default to superuser's org if any
                return Response({'error': 'Superuser must specify an organization ID'}, status=400)
        elif hasattr(request.user, 'organization') and request.user.organization:
            organization = request.user.organization
        else:
            return Response({'error': 'No organization associated with user'}, status=400)
            
        # Total Products
        total_products = Product.objects.filter(organization_id=organization.id).count()
        
        # Granular Booking Stats
        booking_stats = Booking.objects.filter(organization_id=organization.id).aggregate(
            total=Count('booking_id'),
            pending=Count('booking_id', filter=Q(status='pending')),
            confirmed=Count('booking_id', filter=Q(status='confirmed')),
            picked_up=Count('booking_id', filter=Q(status='picked_up')),
            returned=Count('booking_id', filter=Q(status='returned')),
            completed=Count('booking_id', filter=Q(status='completed')),
            cancelled=Count('booking_id', filter=Q(status='cancelled')),
        )
        
        # Active Bookings (Confirmed + Picked Up)
        active_bookings = booking_stats['confirmed'] + booking_stats['picked_up']
        
        # Total Clients
        total_clients = Client.objects.filter(organization_id=organization.id).count()
        
        # Monthly Revenue (sum of amount_paid for bookings created this month)
        today = timezone.now()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        revenue_agg = Booking.objects.filter(
            organization_id=organization.id,
            created_at__gte=start_of_month
        ).aggregate(total=Sum('amount_paid'))
        monthly_revenue = revenue_agg['total'] or 0
        
        # Chart Data
        chart_data = []
        for i in range(5, -1, -1):
            start = start_of_month - relativedelta(months=i)
            end = start + relativedelta(months=1)
            
            bookings_qs = Booking.objects.filter(
                organization_id=organization.id,
                created_at__gte=start,
                created_at__lt=end
            )
            b_count = bookings_qs.count()
            p_agg = bookings_qs.aggregate(total_rev=Sum('amount_paid'))
            
            chart_data.append({
                'name': start.strftime('%b'),
                'revenue': float(p_agg['total_rev'] or 0),
                'bookings': b_count
            })
            
        # Recent Activity
        recent_activity = []
        recent_bookings = Booking.objects.filter(organization_id=organization.id).order_by('-updated_at')[:4]
        for b in recent_bookings:
            recent_activity.append({
                'title': f"Booking #{b.booking_id} {b.get_status_display()}",
                'time': b.updated_at.strftime("%I:%M %p"),
                'type': 'booking'
            })
        
        return Response({
            'total_products': total_products,
            'active_bookings': active_bookings,
            'total_clients': total_clients,
            'monthly_revenue': float(monthly_revenue),
            'currency_symbol': organization.currency.symbol if organization.currency else '$',
            'chart_data': chart_data,
            'recent_activity': recent_activity,
            'booking_stats': booking_stats,
        })

class ScanItemAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasPaidSubscription]
    def post(self, request):
        if not hasattr(request.user, 'organization') or not request.user.organization:
            return Response({'error': 'No organization associated with user'}, status=status.HTTP_400_BAD_REQUEST)
            
        serial_number = request.data.get('serial_number')
        action = request.data.get('action') # 'verify', 'pickup', 'return'
        req_quantity = request.data.get('quantity')
        qty_good = request.data.get('qty_good')
        qty_damaged = request.data.get('qty_damaged')
        condition = request.data.get('condition', 'good') # For single units
        
        if not serial_number:
            return Response({'error': 'Serial number is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            unit = ProductUnit.objects.select_related('product').get(
                product__organization_id=request.user.organization_id, 
                serial_number=serial_number
            )
        except ProductUnit.DoesNotExist:
            return Response({'error': 'Unit not found on this account'}, status=status.HTTP_404_NOT_FOUND)
            
        if action == 'verify':
            return Response({
                'serial_number': unit.serial_number,
                'product_name': unit.product.name,
                'unit_name': unit.name,
                'unit_type': unit.unit_type,
                'status': unit.status,
                'quantity': unit.quantity,                  # total qty (bulk)
                'available_quantity': unit.quantity_available,  # units available right now
                'quantity_rented': unit.quantity_rented,
                'quantity_good': unit.quantity_good,
                'quantity_damaged': unit.quantity_damaged,
            })
            
        elif action == 'pickup':
            # Handle Single vs Bulk
            if unit.unit_type == 'bulk':
                # Find associated BookingItemUnit that still needs picking up
                booking_unit = BookingItemUnit.objects.filter(
                    product_unit=unit, 
                    quantity_picked_up__lt=models.F('quantity'),
                    booking_item__booking__status__in=['confirmed', 'picked_up']
                ).select_related('booking_item__booking', 'booking_item__booking__client').first()
                
                if not booking_unit:
                    return Response({'error': 'No pending bulk booking items found for this unit'}, status=status.HTTP_400_BAD_REQUEST)
                
                if req_quantity is None:
                    # Request quantity from UI
                    remaining = booking_unit.quantity - booking_unit.quantity_picked_up
                    return Response({
                        'requires_quantity': True,
                        'max_quantity': remaining,
                        'product_name': unit.product.name,
                        'message': f"How many {unit.product.name} are being picked up? ({remaining} remaining)"
                    })
                
                try:
                    qty = int(req_quantity)
                    if qty <= 0: raise ValueError()
                except:
                    return Response({'error': 'Invalid quantity'}, status=status.HTTP_400_BAD_REQUEST)
                
                remaining = booking_unit.quantity - booking_unit.quantity_picked_up
                if qty > remaining:
                    return Response({'error': f"Quantity exceeds remaining booking amount ({remaining})"}, status=status.HTTP_400_BAD_REQUEST)
                
                booking_unit.quantity_picked_up += qty
                if booking_unit.quantity_picked_up == booking_unit.quantity:
                    booking_unit.status = 'picked_up'
                    # For bulk, the inventory unit remains rented as long as some items are out
                    unit.status = 'rented' 
                booking_unit.pickup_date = timezone.now()
                booking_unit.save()
                
                # Update parent item pick-up count
                item = booking_unit.booking_item
                item.total_picked_up = item.units.aggregate(total=Sum('quantity_picked_up'))['total'] or 0
                item.save()
                
                booking = item.booking
                return Response({
                    'success': True,
                    'message': f'Marked {qty} items as Picked Up',
                    'product_name': unit.product.name,
                    'booking_id': f"#{booking.booking_id}",
                    'client_name': f"{booking.client.first_name} {booking.client.last_name}"
                })

            else:
                # Original single unit logic
                booking_unit = BookingItemUnit.objects.filter(
                    product_unit=unit, 
                    status='pending',
                    booking_item__booking__status__in=['confirmed', 'picked_up']
                ).select_related('booking_item__booking', 'booking_item__booking__client').first()
                
                if not booking_unit:
                    return Response({'error': 'No pending booking found for this unit'}, status=status.HTTP_400_BAD_REQUEST)
                    
                unit.status = 'rented'
                unit.save()   # triggers sync_quantities()
                
                booking_unit.status = 'picked_up'
                booking_unit.quantity_picked_up = 1
                booking_unit.pickup_date = timezone.now()
                booking_unit.save()
                
                item = booking_unit.booking_item
                item.total_picked_up = item.units.filter(status='picked_up').count()
                item.save()
                
                booking = item.booking
                return Response({
                    'success': True,
                    'message': 'Item marked as Picked Up',
                    'product_name': unit.product.name,
                    'serial_number': unit.serial_number,
                    'booking_id': f"#{booking.booking_id}",
                    'client_name': f"{booking.client.first_name} {booking.client.last_name}"
                })
            
        elif action == 'return':
            if unit.unit_type == 'bulk':
                booking_unit = BookingItemUnit.objects.filter(
                    product_unit=unit, 
                    # Consider both fully picked up and partially returned
                    quantity_picked_up__gt=models.F('quantity_returned_good') + models.F('quantity_returned_damaged')
                ).select_related('booking_item__booking', 'booking_item__booking__client').first()
                
                if not booking_unit:
                    return Response({'error': 'No items currently picked up for this bulk unit'}, status=status.HTTP_400_BAD_REQUEST)

                if qty_good is None and qty_damaged is None:
                    total_out = booking_unit.quantity_picked_up - (booking_unit.quantity_returned_good + booking_unit.quantity_returned_damaged)
                    return Response({
                        'requires_quantity': True,
                        'is_return': True,
                        'max_quantity': total_out,
                        'product_name': unit.product.name,
                        'message': f"How many {unit.product.name} are being returned? ({total_out} currently out)"
                    })

                try:
                    q_good = int(qty_good or 0)
                    q_damaged = int(qty_damaged or 0)
                    if q_good < 0 or q_damaged < 0 or (q_good + q_damaged) <= 0: raise ValueError()
                except:
                    return Response({'error': 'Invalid quantities'}, status=status.HTTP_400_BAD_REQUEST)

                total_returning = q_good + q_damaged
                total_out = booking_unit.quantity_picked_up - (booking_unit.quantity_returned_good + booking_unit.quantity_returned_damaged)
                
                if total_returning > total_out:
                    return Response({'error': f"Quantity exceeds currently out amount ({total_out})"}, status=status.HTTP_400_BAD_REQUEST)

                booking_unit.quantity_returned_good += q_good
                booking_unit.quantity_returned_damaged += q_damaged
                
                # Sync with ghost fields to satisfy NOT NULL constraints
                booking_unit.quantity_returned_in_good_condition = booking_unit.quantity_returned_good
                booking_unit.quantity_returned_in_damaged_condition = booking_unit.quantity_returned_damaged
                
                if booking_unit.quantity_returned_good + booking_unit.quantity_returned_damaged == booking_unit.quantity_picked_up:
                    booking_unit.status = 'returned'
                    # Bulk unit return: if all are back, set inventory status
                    unit.status = 'available'
                
                booking_unit.return_date = timezone.now()
                booking_unit.save()

                # Update quantity_damaged on the same unit and re-sync
                if q_damaged > 0:
                    unit.quantity_damaged = min(
                        unit.quantity,
                        (unit.quantity_damaged or 0) + q_damaged
                    )
                unit.sync_quantities()   # recalculates good / available
                unit.save()

                # Update parent item return count
                item = booking_unit.booking_item
                item.total_returned = (
                    item.units.aggregate(
                        total=Sum('quantity_returned_good') + Sum('quantity_returned_damaged')
                    )['total'] or 0
                )
                item.save()

                booking = item.booking
                return Response({
                    'success': True,
                    'message': f'Returned {q_good} good and {q_damaged} damaged items',
                    'product_name': unit.product.name,
                    'booking_id': f"#{booking.booking_id}",
                    'client_name': f"{booking.client.first_name} {booking.client.last_name}"
                })

            else:
                # Single unit return
                booking_unit = BookingItemUnit.objects.filter(
                    product_unit=unit, 
                    status='picked_up'
                ).select_related('booking_item__booking', 'booking_item__booking__client').first()
                
                if not booking_unit:
                    return Response({'error': 'This item is not currently marked as picked up in any booking'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Check for condition in request
                if not request.data.get('condition_submitted'):
                    return Response({
                        'requires_condition': True,
                        'product_name': unit.product.name,
                        'serial_number': unit.serial_number,
                        'message': f"What is the condition of {unit.product.name} (SN: {unit.serial_number})?"
                    })

                if condition == 'damaged':
                    unit.status = 'damaged'
                    booking_unit.quantity_returned_damaged = 1
                    booking_unit.quantity_returned_in_damaged_condition = 1
                    booking_unit.return_condition = 'damaged'
                else:
                    unit.status = 'available'
                    booking_unit.quantity_returned_good = 1
                    booking_unit.quantity_returned_in_good_condition = 1
                    booking_unit.return_condition = 'good'
                
                unit.save()
                
                booking_unit.status = 'returned'
                booking_unit.return_date = timezone.now()
                booking_unit.save()
                
                item = booking_unit.booking_item
                item.total_returned = item.units.filter(status='returned').count()
                item.save()
                
                booking = item.booking
                return Response({
                    'success': True,
                    'message': f'Item marked as Returned ({condition})',
                    'product_name': unit.product.name,
                    'serial_number': unit.serial_number,
                    'booking_id': f"#{booking.booking_id}",
                    'client_name': f"{booking.client.first_name} {booking.client.last_name}"
                })
            
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
