"""
Accessory checklists for check out (pickup) and check in (return).

Check out expects each active accessory × the pieces handed over.
Check in expects what actually went out, not the unit's current kit list,
so a part marked "not sent" at check out is not reported missing on return.
"""

from collections import defaultdict

from django.db.models import Sum

from .models import HandoverCheck, HandoverCheckLine, UnitAccessory

ALLOWED_ISSUES = {
    HandoverCheck.STAGE_CHECK_OUT: {
        HandoverCheckLine.ISSUE_MISSING,
        HandoverCheckLine.ISSUE_DAMAGED,
        HandoverCheckLine.ISSUE_NOT_SENT,
    },
    HandoverCheck.STAGE_CHECK_IN: {
        HandoverCheckLine.ISSUE_MISSING,
        HandoverCheckLine.ISSUE_DAMAGED,
        HandoverCheckLine.ISSUE_CONSUMED,
    },
}


class ChecklistOutOfDate(Exception):
    """The submitted checklist doesn't match what is expected now."""


def _line(acc, expected):
    return {
        "accessory_id": acc.accessory_id,
        "name": acc.name,
        "description": acc.description or "",
        "kind": acc.kind,
        # Consumables are expected to be used up, so they are never critical.
        "is_critical": acc.is_critical and acc.kind != UnitAccessory.KIND_CONSUMABLE,
        "expected_quantity": expected,
    }


def build_checklist(booking_unit, stage, qty):
    """The lines staff must confirm for this handover of `qty` pieces."""
    unit = booking_unit.product_unit

    if stage == HandoverCheck.STAGE_CHECK_OUT:
        return [
            _line(acc, acc.quantity * qty)
            for acc in unit.accessories.filter(is_active=True)
        ]

    # --- Check in: expect what went out and hasn't been accounted for yet ---
    sent = defaultdict(int)
    accessories = {}

    out_checks = booking_unit.handover_checks.filter(
        stage=HandoverCheck.STAGE_CHECK_OUT
    )
    for line in HandoverCheckLine.objects.filter(
        handover_check__in=out_checks, accessory__isnull=False
    ).select_related("accessory"):
        sent[line.accessory_id] += line.confirmed_quantity
        accessories[line.accessory_id] = line.accessory

    # Pieces picked up without a checklist (before this feature, or before the
    # accessory was added) are assumed to have left with the full kit.
    checked_out = out_checks.aggregate(n=Sum("quantity"))["n"] or 0
    unchecked = max(0, booking_unit.quantity_picked_up - checked_out)
    if unchecked:
        for acc in unit.accessories.filter(is_active=True):
            sent[acc.accessory_id] += acc.quantity * unchecked
            accessories[acc.accessory_id] = acc

    accounted = defaultdict(int)
    for row in (
        HandoverCheckLine.objects.filter(
            handover_check__booking_item_unit=booking_unit,
            handover_check__stage=HandoverCheck.STAGE_CHECK_IN,
            accessory__isnull=False,
        )
        .values("accessory_id")
        .annotate(n=Sum("expected_quantity"))
    ):
        accounted[row["accessory_id"]] = row["n"] or 0

    returned_so_far = booking_unit.total_returned
    is_final = returned_so_far + qty >= booking_unit.quantity_picked_up

    lines = []
    for acc_id, acc in sorted(
        accessories.items(), key=lambda kv: (kv[1].sort_order, kv[0])
    ):
        outstanding = sent[acc_id] - accounted[acc_id]
        if outstanding <= 0:
            continue
        expected = outstanding if is_final else min(outstanding, acc.quantity * qty)
        if expected > 0:
            lines.append(_line(acc, expected))
    return lines


def normalize_submission(lines, submitted, stage):
    """
    Match submitted answers to the expected lines.

    `submitted` is a list of {accessory_id, confirmed_quantity, issue, note}.
    Raises ChecklistOutOfDate if an expected line wasn't answered (e.g. the
    kit list changed after the checklist was shown).

    Consumables are compulsory at check out but optional at check in: an
    unanswered consumable is left out, and a short count is "used up".
    """
    by_id = {}
    for entry in submitted or []:
        try:
            by_id[int(entry.get("accessory_id"))] = entry
        except (TypeError, ValueError, AttributeError):
            continue

    allowed = ALLOWED_ISSUES[stage]
    result = []
    for line in lines:
        entry = by_id.get(line["accessory_id"])
        is_consumable = line["kind"] == UnitAccessory.KIND_CONSUMABLE
        consumable_in = is_consumable and stage == HandoverCheck.STAGE_CHECK_IN
        if entry is None:
            if consumable_in:
                continue
            raise ChecklistOutOfDate()
        expected = line["expected_quantity"]
        try:
            confirmed = int(entry.get("confirmed_quantity", expected))
        except (TypeError, ValueError):
            confirmed = expected
        confirmed = max(0, min(confirmed, expected))

        issue = ""
        if confirmed < expected:
            issue = entry.get("issue") or HandoverCheckLine.ISSUE_MISSING
            if issue not in allowed:
                issue = HandoverCheckLine.ISSUE_MISSING
            if consumable_in:
                issue = HandoverCheckLine.ISSUE_CONSUMED

        result.append(
            {
                **line,
                "confirmed_quantity": confirmed,
                "issue": issue,
                "note": (entry.get("note") or "").strip(),
            }
        )
    return result


def _flag_reason(lines):
    parts = []
    for issue, label in (
        (HandoverCheckLine.ISSUE_MISSING, "Missing"),
        (HandoverCheckLine.ISSUE_DAMAGED, "Damaged"),
    ):
        items = [
            f"{ln['expected_quantity'] - ln['confirmed_quantity']} × {ln['name']}"
            + (" (critical)" if ln["is_critical"] else "")
            for ln in lines
            if ln["issue"] == issue
        ]
        if items:
            parts.append(f"{label}: {', '.join(items)}")
    return ". ".join(parts)


def record_check(booking_unit, stage, qty, lines, user, note=""):
    """Record a check out / check in: who, when, how many, and the confirmed
    accessories (no lines when the unit has none)."""

    losses = [ln for ln in lines if ln["issue"] in HandoverCheckLine.LOSS_ISSUES]
    check = HandoverCheck.objects.create(
        organization_id=booking_unit.organization_id
        or booking_unit.product_unit.organization_id,
        booking_item_unit=booking_unit,
        stage=stage,
        quantity=qty,
        note=note or None,
        has_issues=bool(losses),
        is_incomplete=stage == HandoverCheck.STAGE_CHECK_IN
        and any(ln["is_critical"] for ln in losses),
        flag_reason=_flag_reason(lines) or None,
        performed_by=user if getattr(user, "is_authenticated", False) else None,
    )
    HandoverCheckLine.objects.bulk_create(
        [
            HandoverCheckLine(
                handover_check=check,
                accessory_id=ln["accessory_id"],
                name=ln["name"],
                is_critical=ln["is_critical"],
                kind=ln["kind"],
                expected_quantity=ln["expected_quantity"],
                confirmed_quantity=ln["confirmed_quantity"],
                issue=ln["issue"],
                note=ln["note"] or None,
            )
            for ln in lines
        ]
    )
    return check


def check_summary(check):
    if check is None:
        return None
    return {
        "check_id": check.check_id,
        "has_issues": check.has_issues,
        "is_incomplete": check.is_incomplete,
        "flag_reason": check.flag_reason,
    }
