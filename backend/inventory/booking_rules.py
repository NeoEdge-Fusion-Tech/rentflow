"""Helpers for an organization's booking availability settings
(available days + operating hours)."""

from django.utils import timezone

DAYS_OF_WEEK = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]
_DAY_LOOKUP = {d.lower(): d for d in DAYS_OF_WEEK}
_DAY_LOOKUP.update({d[:3].lower(): d for d in DAYS_OF_WEEK})


def normalize_days(value):
    """Return a de-duplicated, week-ordered list of canonical day names.

    Accepts a list (the stored format) or a legacy comma-separated string
    such as "Monday,Tuesday". Raises ValueError on an unknown day name.
    """
    if value is None:
        return []
    if isinstance(value, str):
        value = value.split(",")
    if not isinstance(value, (list, tuple)):
        raise ValueError("Available days must be a list of day names.")

    picked = set()
    for raw in value:
        name = str(raw).strip()
        if not name:
            continue
        day = _DAY_LOOKUP.get(name.lower())
        if not day:
            raise ValueError(f"'{name}' is not a valid day of the week.")
        picked.add(day)
    return [d for d in DAYS_OF_WEEK if d in picked]


def schedule_errors(settings, label, dt):
    """Return a list of human-readable problems with scheduling `dt` under
    `settings`. An empty day list or unset hours means "no restriction"."""
    if dt is None or settings is None:
        return []
    if timezone.is_aware(dt):
        dt = timezone.localtime(dt)

    errors = []
    try:
        days = normalize_days(settings.available_days)
    except ValueError:
        days = []
    day_name = DAYS_OF_WEEK[dt.weekday()]
    if days and day_name not in days:
        errors.append(
            f"{label} falls on a {day_name}, but bookings are only available on "
            f"{', '.join(days)}."
        )

    open_t, close_t = settings.open_time, settings.close_time
    if open_t and close_t:
        t = dt.time().replace(second=0, microsecond=0)
        if not (open_t <= t <= close_t):
            errors.append(
                f"{label} must be between {open_t.strftime('%H:%M')} and "
                f"{close_t.strftime('%H:%M')}."
            )
    return errors
