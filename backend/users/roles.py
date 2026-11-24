"""Built-in team roles every organization starts with. They are ordinary,
editable Role rows; seeding never overwrites an existing role."""

ALL = {"read": True, "write": True, "delete": False}
NONE = {"read": False, "write": False, "delete": False}

MODULES = [
    "dashboard",
    "bookings",
    "invoices",
    "inventory",
    "projects",
    "payments",
    "team",
    "settings",
    "reports",
    "validator_app",
]

DEFAULT_ROLES = {
    # Checks bookings out and in. Sees only the validator.
    "validator": {
        "description": "Checks equipment out and in. Sees only the Validator.",
        "permissions": {m: (ALL if m == "validator_app" else NONE) for m in MODULES},
    },
    # Day-to-day operations plus the validator; no team, settings or deletes.
    "support": {
        "description": "Runs day-to-day operations and can use the Validator.",
        "permissions": {
            m: (NONE if m in ("team", "settings") else ALL) for m in MODULES
        },
    },
}


def ensure_default_roles(organization, role_model=None):
    if role_model is None:
        from .models import Role as role_model
    for name, spec in DEFAULT_ROLES.items():
        role_model.objects.get_or_create(
            organization=organization,
            name=name,
            defaults={
                "description": spec["description"],
                "permissions": spec["permissions"],
            },
        )
