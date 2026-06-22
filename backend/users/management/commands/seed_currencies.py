from django.core.management.base import BaseCommand
from users.models import Currency

class Command(BaseCommand):
    help = 'Seeds the database with common currencies'

    def handle(self, *args, **kwargs):
        currencies = [
            {'code': 'USD', 'name': 'US Dollar', 'symbol': '$'},
            {'code': 'EUR', 'name': 'Euro', 'symbol': '€'},
            {'code': 'GBP', 'name': 'British Pound', 'symbol': '£'},
            {'code': 'NGN', 'name': 'Nigerian Naira', 'symbol': '₦'},
            {'code': 'CAD', 'name': 'Canadian Dollar', 'symbol': 'C$'},
            {'code': 'AUD', 'name': 'Australian Dollar', 'symbol': 'A$'},
            {'code': 'INR', 'name': 'Indian Rupee', 'symbol': '₹'},
            {'code': 'JPY', 'name': 'Japanese Yen', 'symbol': '¥'},
            {'code': 'ZAR', 'name': 'South African Rand', 'symbol': 'R'},
            {'code': 'KES', 'name': 'Kenyan Shilling', 'symbol': 'KSh'},
            {'code': 'RWF', 'name': 'Rwandan Franc', 'symbol': 'Rwf'},
            {'code': 'GHS', 'name': 'Ghana Cedi', 'symbol': 'GH₵'},
        ]

        count = 0
        for data in currencies:
            obj, created = Currency.objects.get_or_create(
                code=data['code'],
                defaults={'name': data['name'], 'symbol': data['symbol']}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created currency {data['code']}"))
                count += 1
            else:
                self.stdout.write(self.style.WARNING(f"Currency {data['code']} already exists"))
        
        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {count} currencies!"))
