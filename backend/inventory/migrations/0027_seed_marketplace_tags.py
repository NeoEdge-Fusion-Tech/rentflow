from django.db import migrations
from django.utils.text import slugify

STARTER_TAGS = [
    "Chairs & Seating",
    "Tables",
    "Tents & Canopies",
    "Stages & Platforms",
    "Lighting",
    "Sound & Audio",
    "Screens & Projection",
    "Decor & Florals",
    "Linens & Drapery",
    "Tableware & Catering",
    "Power & Generators",
    "Cooling & Heating",
    "Furniture & Lounge",
    "Photo Booths & Backdrops",
]


def seed(apps, schema_editor):
    Tag = apps.get_model("inventory", "MarketplaceTag")
    if Tag.objects.exists():
        return
    for i, name in enumerate(STARTER_TAGS):
        Tag.objects.create(name=name, slug=slugify(name), sort_order=i)


class Migration(migrations.Migration):
    dependencies = [("inventory", "0026_marketplace_tags")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
