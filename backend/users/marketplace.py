"""What an organization must have on its profile before it can list
products on the event marketplace."""

from django.db.models import Q

REQUIRED_FIELDS = [
    ("address", "Company address"),
    ("country", "Country"),
    ("city", "City"),
    ("currency", "Currency"),
]


def marketplace_profile_missing(org):
    """Labels of the required profile fields `org` hasn't filled in."""
    if org is None:
        return [label for _, label in REQUIRED_FIELDS]
    missing = []
    for field, label in REQUIRED_FIELDS:
        value = getattr(org, f"{field}_id" if field == "currency" else field)
        if value is None or (isinstance(value, str) and not value.strip()):
            missing.append(label)
    return missing


def marketplace_ready_q(prefix="organization__"):
    """Queryset filter for organizations with a complete marketplace profile."""
    return (
        Q(**{f"{prefix}currency__isnull": False})
        & ~Q(**{f"{prefix}country": ""})
        & ~Q(**{f"{prefix}city": ""})
        & Q(**{f"{prefix}address__isnull": False})
        & ~Q(**{f"{prefix}address": ""})
    )


def missing_message(missing):
    return (
        "Complete your company profile before listing on the marketplace. "
        f"Missing: {', '.join(missing)}. Add them in Settings → Workspace."
    )
