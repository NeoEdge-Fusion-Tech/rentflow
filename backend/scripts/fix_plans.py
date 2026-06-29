import os
import django
import sys

sys.path.append('/Users/sunday/Documents/Project/NeoEdge/rentflow-saas/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import Organization, SubscriptionPlan, Subscription

def run():
    free_plan, created = SubscriptionPlan.objects.get_or_create(
        name='free',
        defaults={
            'description': 'Free Tier',
            'price': 0.0,
            'billing_cycle': 'monthly',
            'is_free': True,
            'has_inventory': True
        }
    )
    if not created:
        free_plan.is_free = True
        free_plan.has_inventory = True
        free_plan.save()

    print("Free plan ensured:", free_plan)
    
    orgs = Organization.objects.all()
    count = 0
    for org in orgs:
        if not hasattr(org, 'subscription') or not org.subscription:
            sub, _ = Subscription.objects.get_or_create(
                organization=org,
                defaults={
                    'plan_name': 'free',
                    'status': 'active'
                }
            )
            count += 1
            
        if not org.subscription_plan or org.subscription_plan == '':
            org.subscription_plan = 'free'
            org.save()
            
    print(f"Created subscription for {count} organizations.")
    
if __name__ == '__main__':
    run()
