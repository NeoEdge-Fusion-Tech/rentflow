from django.db import models
from rest_framework import viewsets, permissions, filters, status
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

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('all') != 'true':
            qs = qs.filter(is_active=True)
        return qs
        

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
    filter_backends = [django_filters.DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'slug', 'description']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('all') != 'true':
            qs = qs.filter(is_active=True)
        return qs

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
                    "name": u.name or u.serial_number
                } for u in available_units
            ]
        }
        return Response(data)

class ProductUnitViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = ProductUnit.objects.all()
    serializer_class = ProductUnitSerializer
    
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
    filter_backends = [django_filters.DjangoFilterBackend, filters.SearchFilter]
    filterset_class = BookingFilter
    search_fields = ['event_location', 'contact_name', 'client__first_name', 'client__last_name', 'booking_id']

class BookingItemViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = BookingItem.objects.all()
    serializer_class = BookingItemSerializer

class BookingItemUnitViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = BookingItemUnit.objects.all()
    serializer_class = BookingItemUnitSerializer

class TenantStatsAPIView(APIView):
    def get(self, request):
        organization_id = request.query_params.get('organization_id')
        if organization_id and request.user.is_superuser:
            from users.models import Organization
            try:
                organization = Organization.objects.get(id=organization_id)
            except Organization.DoesNotExist:
                return Response({'error': 'Organization not found'}, status=404)
        elif hasattr(request.user, 'organization') and request.user.organization:
            organization = request.user.organization
        else:
            return Response({'error': 'No organization associated with user'}, status=400)
            
        # Total Products
        total_products = Product.objects.filter(organization=organization).count()
        
        # Active Bookings
        active_bookings = Booking.objects.filter(
            organization=organization
        ).exclude(status__in=['returned', 'cancelled']).count()
        
        # Total Clients
        total_clients = Client.objects.filter(organization=organization).count()
        
        # Monthly Revenue (approximated for this month)
        today = timezone.now()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        revenue_agg = Payment.objects.filter(
            booking__organization=organization,
            payment_date__gte=start_of_month,
            status='completed'
        ).aggregate(total=Sum('amount'))
        monthly_revenue = revenue_agg['total'] or 0
        
        # Chart Data
        chart_data = []
        for i in range(5, -1, -1):
            start = start_of_month - relativedelta(months=i)
            end = start + relativedelta(months=1)
            b_count = Booking.objects.filter(
                organization=organization,
                created_at__gte=start,
                created_at__lt=end
            ).count()

            p_agg = Payment.objects.filter(
                booking__organization=organization,
                payment_date__gte=start,
                payment_date__lt=end,
                status='completed'
            ).aggregate(total_rev=Sum('amount'))
            
            chart_data.append({
                'name': start.strftime('%b'),
                'revenue': float(p_agg['total_rev'] or 0),
                'bookings': b_count
            })
            
        # Recent Activity
        recent_activity = []
        recent_bookings = Booking.objects.filter(organization=organization).order_by('-updated_at')[:4]
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
            'recent_activity': recent_activity
        })

class ScanItemAPIView(APIView):
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
                product__organization=request.user.organization, 
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
