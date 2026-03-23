import os
import django
import sys

# Setup Django
sys.path.append('/Users/sunday/Documents/Project/rentflow-saas/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User
from django.db.models import Count

def cleanup_duplicates():
    print("--- Cleaning Up Duplicate Emails ---")
    
    # Find all emails that appear more than once
    dupes = User.objects.values('email').annotate(count=Count('id')).filter(count__gt=1, email__isnull=False)
    
    for entry in dupes:
        email = entry['email']
        if not email: continue
        
        users = list(User.objects.filter(email=email).order_by('id'))
        print(f"Found {len(users)} users with email '{email}'")
        
        # Keep the first one, rename the rest
        for i, user in enumerate(users[1:], start=1):
            new_email = f"{email}.dup{i}"
            print(f"  - Renaming User ID {user.id} ({user.username}) to {new_email}")
            user.email = new_email
            # Also update username if it was the email (common in this app)
            if user.username == email:
                user.username = new_email
            user.save()

    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_duplicates()
