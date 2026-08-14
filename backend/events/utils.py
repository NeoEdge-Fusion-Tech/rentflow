import io
import os
from decimal import Decimal
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    Image,
)
from reportlab.lib.units import inch
from django.db.models import Sum
import requests


from django.db.models.functions import Coalesce, Cast
from django.db.models import DateField


def compute_period_totals(organization, start, end):
    from .models import Event, ExpenseLineItem
    from payment.models import GeneralExpense, Invoice

    start_date = start.date() if hasattr(start, "date") else start
    end_date = end.date() if hasattr(end, "date") else end

    org_currency = organization.currency.symbol if organization.currency else "$"

    # 1. Standalone Revenue
    standalone_rev_qs = (
        Invoice.objects.filter(
            organization=organization,
            issue_date__gte=start,
            issue_date__lt=end,
            pl_events__isnull=True,
            booking__isnull=True,
            status="paid",
        )
        .values("currency__symbol")
        .annotate(total=Sum("total_amount"))
    )

    # 2. General Expenses
    general_exp_total = GeneralExpense.objects.annotate(
        effective_date=Coalesce("date", Cast("created_at", DateField()))
    ).filter(
        organization=organization,
        effective_date__gte=start_date,
        effective_date__lt=end_date,
    ).aggregate(
        total=Sum("amount")
    )[
        "total"
    ] or Decimal(
        "0"
    )

    # 3. Project Revenue & Expenses
    events_in_period = Event.objects.annotate(
        effective_event_date=Coalesce(
            "end_date", "start_date", Cast("created_at", DateField())
        )
    ).filter(
        organization=organization,
        effective_event_date__gte=start_date,
        effective_event_date__lt=end_date,
    )

    revenue_by_event_qs = (
        events_in_period.exclude(invoice__status="cancelled")
        .values("event_id", "invoice__currency__symbol")
        .annotate(total=Sum("invoice__total_amount"))
    )

    expenses_by_event = dict(
        ExpenseLineItem.objects.filter(event__in=events_in_period)
        .values("event_id")
        .annotate(total=Sum("amount"))
        .values_list("event_id", "total")
    )

    # Grouping everything by currency
    # Since expenses don't have currency, they default to org currency
    currency_totals = {}

    def get_curr(sym):
        return sym if sym else org_currency

    def init_curr(sym):
        if sym not in currency_totals:
            currency_totals[sym] = {
                "total_revenue": Decimal("0"),
                "total_project_expenses": Decimal("0"),
                "total_general_expenses": Decimal("0"),
                "total_profit": Decimal("0"),
                "total_loss": Decimal("0"),
            }

    for item in standalone_rev_qs:
        sym = get_curr(item["currency__symbol"])
        init_curr(sym)
        val = item["total"] or Decimal("0")
        currency_totals[sym]["total_revenue"] += val
        currency_totals[sym]["total_profit"] += val

    init_curr(org_currency)
    currency_totals[org_currency]["total_general_expenses"] += general_exp_total
    currency_totals[org_currency]["total_loss"] += general_exp_total
    currency_totals[org_currency]["total_profit"] -= general_exp_total

    # event revenues
    event_revenues = {}
    for item in revenue_by_event_qs:
        eid = item["event_id"]
        sym = get_curr(item["invoice__currency__symbol"])
        val = item["total"] or Decimal("0")
        if eid not in event_revenues:
            event_revenues[eid] = {}
        if sym not in event_revenues[eid]:
            event_revenues[eid][sym] = Decimal("0")
        event_revenues[eid][sym] += val

        init_curr(sym)
        currency_totals[sym]["total_revenue"] += val

    # event expenses
    for eid, exp_val in expenses_by_event.items():
        if exp_val is None:
            exp_val = Decimal("0")
        init_curr(org_currency)
        currency_totals[org_currency]["total_project_expenses"] += exp_val

        # for net profit/loss per event, it's complex if revenue is multi-currency
        # and expense is single currency.
        # We'll just subtract the expense from the org currency profit.
        currency_totals[org_currency]["total_profit"] -= exp_val
        currency_totals[org_currency]["total_loss"] += exp_val

    # Wait, we need to correctly compute profit/loss.
    # Actually, we can just compute profit/loss at the end for each currency:
    for sym, totals in currency_totals.items():
        net = (
            totals["total_revenue"]
            - totals["total_project_expenses"]
            - totals["total_general_expenses"]
        )
        totals["total_profit"] = net if net > 0 else Decimal("0")
        totals["total_loss"] = -net if net < 0 else Decimal("0")

    return currency_totals


def _load_logo_flowable(organization, size=1.1 * inch):
    """Loads the organization's uploaded logo from local path or URL."""
    try:
        if not organization.company_logo:
            return None
        try:
            if hasattr(organization.company_logo, "path"):
                path = organization.company_logo.path
                if os.path.exists(path):
                    return Image(path, size, size)
        except Exception:
            pass
        if hasattr(organization.company_logo, "url"):
            url = organization.company_logo.url
            if url.startswith("http"):
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    image_stream = io.BytesIO(response.content)
                    return Image(image_stream, size, size)
    except Exception as e:
        print(f"Error loading logo: {e}")
    return None


CHECKLIST_TYPE_LABELS = {
    "pre_event": "Pre-Event",
    "during_event": "During Event",
    "post_event": "Post-Event",
}


def generate_checklist_pdf(event, top_level_tasks):
    """
    Generates a PDF of an event's task checklist, grouped by checklist type,
    with subtasks indented beneath their parent.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )
    styles = getSampleStyleSheet()
    organization = event.organization

    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Heading1"],
        fontSize=24,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=6,
        fontName="Helvetica-Bold",
    )
    subtitle_style = ParagraphStyle(
        "SubtitleStyle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
    )
    section_style = ParagraphStyle(
        "SectionStyle",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.white,
        fontName="Helvetica-Bold",
    )
    task_style = ParagraphStyle(
        "TaskStyle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#0f172a"),
        leading=14,
    )
    subtask_style = ParagraphStyle(
        "SubtaskStyle",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#334155"),
        leftIndent=16,
        leading=13,
    )
    desc_style = ParagraphStyle(
        "DescStyle",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#64748b"),
        leftIndent=16,
    )

    elements = []

    header_left = [Paragraph(f"{event.name} — Task Checklist", title_style)]
    if event.description:
        header_left.append(Paragraph(event.description, subtitle_style))

    header_right = []
    logo = _load_logo_flowable(organization, size=1.1 * inch)
    if logo:
        header_right.append(logo)

    top_table = Table([[header_left, header_right]], colWidths=[5.2 * inch, 2 * inch])
    top_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    elements.append(top_table)
    elements.append(Spacer(1, 0.3 * inch))

    tasks_by_type = {"pre_event": [], "during_event": [], "post_event": []}
    for task in top_level_tasks:
        tasks_by_type.setdefault(task.checklist_type, []).append(task)

    for checklist_type in ["pre_event", "during_event", "post_event"]:
        tasks = tasks_by_type.get(checklist_type, [])

        section_header = Table(
            [[Paragraph(CHECKLIST_TYPE_LABELS[checklist_type], section_style)]],
            colWidths=[7.2 * inch],
        )
        section_header.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#0f172a")),
                    ("PADDING", (0, 0), (0, 0), 8),
                ]
            )
        )
        elements.append(section_header)
        elements.append(Spacer(1, 0.1 * inch))

        if not tasks:
            elements.append(Paragraph("No tasks in this section.", subtitle_style))
        else:
            for task in tasks:
                box = "☑" if task.is_done else "☐"
                due = (
                    f" — Due {task.due_date.strftime('%b %d, %Y %H:%M')}"
                    if task.due_date
                    else ""
                )
                elements.append(Paragraph(f"{box} {task.name}{due}", task_style))
                if task.description:
                    elements.append(Paragraph(task.description, desc_style))
                for sub in task.subtasks.all():
                    sub_box = "☑" if sub.is_done else "☐"
                    sub_due = (
                        f" — Due {sub.due_date.strftime('%b %d, %Y %H:%M')}"
                        if sub.due_date
                        else ""
                    )
                    elements.append(
                        Paragraph(f"{sub_box} {sub.name}{sub_due}", subtask_style)
                    )
                    if sub.description:
                        elements.append(Paragraph(sub.description, desc_style))
        elements.append(Spacer(1, 0.25 * inch))

    small_style = ParagraphStyle(
        "SmallStyle",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#94a3b8"),
        alignment=TA_CENTER,
    )
    elements.append(Spacer(1, 0.2 * inch))
    elements.append(Paragraph("Powered by NeoOps", small_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
