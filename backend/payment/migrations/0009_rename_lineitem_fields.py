from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('payment', '0008_add_paystack_reference_to_invoice'),
    ]

    operations = [
        migrations.RenameField(
            model_name='invoicelineitem',
            old_name='description',
            new_name='name',
        ),
        migrations.RenameField(
            model_name='invoicelineitem',
            old_name='details',
            new_name='description',
        ),
    ]
