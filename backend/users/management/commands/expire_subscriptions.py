from django.core.management.base import BaseCommand
from django.utils import timezone
from loguru import logger

from users.models import Subscription
from users.subscriptions import expire_if_due


class Command(BaseCommand):
    help = "Marks overdue subscriptions as expired and moves their organizations to the free plan"

    def handle(self, *args, **kwargs):
        overdue = Subscription.objects.filter(
            current_period_end__lt=timezone.now(), status="active"
        ).select_related("organization")

        count = 0
        for sub in overdue:
            if expire_if_due(sub.organization):
                count += 1
                logger.info(
                    f"Subscription for {sub.organization.name} expired; moved to free plan."
                )

        self.stdout.write(self.style.SUCCESS(f"Expired {count} overdue subscriptions."))
