"""Shared date-range filter + ordering for list endpoints.

A view opts in by setting `date_filter_fields`, a map of public name ->
{"field": model datetime field, "payments": related payments path (for
"paid")}. Query params:

  date_field = created | updated | paid      (default: created)
  date_from  = YYYY-MM-DD   (inclusive, in the organization's time zone)
  date_to    = YYYY-MM-DD   (inclusive)
  ordering   = -created | created | -updated | updated | -paid | paid
               (default: view.default_ordering, else "-created")
"""

import datetime

from django.db.models import F, Max, Q
from rest_framework.filters import BaseFilterBackend


def _org_tz(request):
    org = getattr(getattr(request, "user", None), "organization", None)
    tz = getattr(org, "tzinfo", None)
    if tz is not None:
        return tz
    from zoneinfo import ZoneInfo

    return ZoneInfo("UTC")


def _parse_date(value):
    try:
        return datetime.date.fromisoformat(value) if value else None
    except ValueError:
        return None


class DateRangeOrderingFilter(BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        fields = getattr(view, "date_filter_fields", None)
        if not fields:
            return queryset
        params = request.query_params

        # ---- date range
        which = params.get("date_field") or "created"
        spec = fields.get(which)
        start, end = _parse_date(params.get("date_from")), _parse_date(
            params.get("date_to")
        )
        if spec and (start or end):
            tz = _org_tz(request)
            lo = (
                datetime.datetime.combine(start, datetime.time.min, tzinfo=tz)
                if start
                else None
            )
            hi = (
                datetime.datetime.combine(
                    end + datetime.timedelta(days=1), datetime.time.min, tzinfo=tz
                )
                if end
                else None
            )
            if "payments" in spec:
                path = spec["payments"]
                cond = Q(**{f"{path}__status": "completed"})
                if lo:
                    cond &= Q(**{f"{path}__payment_date__gte": lo})
                if hi:
                    cond &= Q(**{f"{path}__payment_date__lt": hi})
                queryset = queryset.filter(cond).distinct()
            else:
                f = spec["field"]
                if lo:
                    queryset = queryset.filter(**{f"{f}__gte": lo})
                if hi:
                    queryset = queryset.filter(**{f"{f}__lt": hi})

        # ---- ordering
        ordering = params.get("ordering") or getattr(
            view, "default_ordering", "-created"
        )
        desc = ordering.startswith("-")
        key = ordering.lstrip("-")
        spec = fields.get(key) or fields.get("created")
        pk = queryset.model._meta.pk.name
        if "payments" in spec:
            path = spec["payments"]
            queryset = queryset.annotate(
                _last_paid=Max(
                    f"{path}__payment_date",
                    filter=Q(**{f"{path}__status": "completed"}),
                )
            )
            expr = F("_last_paid")
        else:
            expr = F(spec["field"])
        expr = expr.desc(nulls_last=True) if desc else expr.asc(nulls_last=True)
        return queryset.order_by(expr, f"-{pk}" if desc else pk)
