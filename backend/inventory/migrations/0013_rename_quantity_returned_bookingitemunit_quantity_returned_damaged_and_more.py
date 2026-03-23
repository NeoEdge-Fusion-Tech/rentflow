# Manually corrected migration - DB already has quantity_returned_damaged and quantity_returned_good
# Only need to rename rental_unit_label -> unit on productunit

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0012_remove_product_price_per_day'),
    ]

    operations = [
        migrations.RenameField(
            model_name='productunit',
            old_name='rental_unit_label',
            new_name='unit',
        ),
    ]
