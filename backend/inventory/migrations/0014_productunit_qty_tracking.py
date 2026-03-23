# Manually corrected migration — the RenameField for quantity_returned→quantity_returned_damaged
# was already applied to the database by a previous partial migration run, so it is removed here.
# quantity_returned_good was also already added. Only the ProductUnit fields are new.

from django.db import migrations, models


def add_quantity_returned_good_if_missing(apps, schema_editor):
    """Add quantity_returned_good column only if it doesn't already exist."""
    db = schema_editor.connection
    columns = [col.name for col in db.introspection.get_table_description(db.cursor(), 'inventory_bookingitemunit')]
    if 'quantity_returned_good' not in columns:
        schema_editor.execute(
            "ALTER TABLE inventory_bookingitemunit ADD COLUMN quantity_returned_good integer NOT NULL DEFAULT 0"
        )


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0013_rename_quantity_returned_bookingitemunit_quantity_returned_damaged_and_more'),
    ]

    operations = [
        # quantity_returned_good — add only if not already present in DB
        migrations.RunPython(add_quantity_returned_good_if_missing, migrations.RunPython.noop),

        # New ProductUnit quantity tracking fields
        migrations.AddField(
            model_name='productunit',
            name='quantity_available',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='productunit',
            name='quantity_damaged',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='productunit',
            name='quantity_good',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='productunit',
            name='quantity_rented',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
