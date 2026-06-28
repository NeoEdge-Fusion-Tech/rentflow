from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import Subscription, Organization
from loguru import logger

class Command(BaseCommand):
    help = 'Downgrades expired subscriptions to the free plan'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        expired_subscriptions = Subscription.objects.filter(
            current_period_end__lt=now,
            status='active'
        )
        
        count = 0
        for sub in expired_subscriptions:
            # Revert organization to free
            org = sub.organization
            org.subscription_plan = 'free'
            org.save(update_fields=['subscription_plan'])
            
            # Update subscription status
            sub.status = 'expired'
            sub.save(update_fields=['status'])
            
            count += 1
            logger.info(f"Downgraded organization {org.name} to free plan (subscription expired).")

        self.stdout.write(self.style.SUCCESS(f"Successfully downgraded {count} expired subscriptions."))
