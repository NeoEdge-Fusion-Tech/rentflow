"""Single source of truth for which plan an organization is on right now.

A paid subscription only counts while it is active *and* its period hasn't
ended. Every access check goes through `effective_plan_name` /
`effective_plan`, so an overdue renewal loses access immediately, even if
no background job has run. `expire_if_due` additionally records the expiry
(called on login, on /users/me and by the expire_subscriptions command).
"""

from dateutil.relativedelta import relativedelta
from django.utils import timezone

FREE_PLAN_NAME = "free"


def get_subscription(org):
    if org is None:
        return None
    try:
        return org.subscription
    except Exception:  # RelatedObjectDoesNotExist
        return None


def is_current(sub, now=None):
    if sub is None or sub.status != "active":
        return False
    end = sub.current_period_end
    return end is None or end > (now or timezone.now())


def effective_plan_name(org):
    """Plan name to enforce for `org`, or None for "use the free plan"."""
    if org is None:
        return None
    sub = get_subscription(org)
    if sub is not None:
        return sub.plan_name if is_current(sub) else None
    return org.subscription_plan or None


def effective_plan(org):
    from .models import SubscriptionPlan

    name = effective_plan_name(org)
    plan = None
    if name:
        plan = SubscriptionPlan.objects.filter(
            name__iexact=name, is_active=True
        ).first()
    return plan or SubscriptionPlan.objects.filter(is_free=True).first()


def expire_if_due(org):
    """Persist the expiry of an overdue subscription. Returns True if it
    expired just now."""
    sub = get_subscription(org)
    if sub is None or sub.status != "active" or is_current(sub):
        return False
    sub.status = "expired"
    sub.save(update_fields=["status", "updated_at"])
    if org.subscription_plan != FREE_PLAN_NAME:
        org.subscription_plan = FREE_PLAN_NAME
        org.save(update_fields=["subscription_plan"])
    return True


def next_period_end(sub, plan):
    """New period end for a payment: extends from the current end when
    renewing early, otherwise starts now; respects the billing cycle."""
    now = timezone.now()
    start = sub.current_period_end if is_current(sub, now) else now
    if plan is not None and plan.billing_cycle == "yearly":
        return start + relativedelta(years=1)
    return start + relativedelta(months=1)


def subscription_state(org):
    """Summary for the frontend (login / me)."""
    sub = get_subscription(org)
    if sub is None:
        return {
            "plan_name": org.subscription_plan or FREE_PLAN_NAME,
            "status": "active",
            "current_period_end": None,
            "days_left": None,
            "expired": False,
        }
    end = sub.current_period_end
    days_left = None
    if end is not None:
        days_left = max(0, (end - timezone.now()).days)
    expired = not is_current(sub)
    return {
        "plan_name": sub.plan_name,
        "status": "expired" if expired else sub.status,
        "current_period_end": end.isoformat() if end else None,
        "days_left": days_left,
        "expired": expired,
    }
