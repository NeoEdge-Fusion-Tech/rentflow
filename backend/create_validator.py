import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from users.models import User

# Check if a validator exists
validator = User.objects.filter(role='validator').first()
if not validator:
    print("Creating a validator user...")
    validator = User.objects.create_user(
        username='validator@neoedge.com',
        email='validator@neoedge.com',
        password='Password123!',
        role='validator',
        first_name='Val',
        last_name='Idator'
    )
else:
    validator.set_password('Password123!')
    validator.save()

print(f"Validator User Details:")
print(f"Email: {validator.email}")
print(f"Password: Password123!")
