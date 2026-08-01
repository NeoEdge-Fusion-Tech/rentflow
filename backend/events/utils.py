import io
import os
from decimal import Decimal
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.units import inch
from django.db.models import Sum
import requests


def compute_period_totals(organization, start, end):
    """
    Returns (total_revenue, total_expenses, total_profit, total_loss) across all of
    an organization's Events within [start, end).

    Revenue is attributed by each linked invoice's issue_date; expenses by when they
    were logged (created_at) — i.e. "when recorded", not the event's own dates.
    total_profit/total_loss are summed per-event: a project in the black contributes
    its net to total_profit, a project in the red contributes its magnitude to
    total_loss (so both are always >= 0, unlike a single net figure).
    """
    from .models import Event, ExpenseLineItem
    from payment.models import GeneralExpense
    from django.db.models.functions import Coalesce, Cast
    from django.db.models import DateField

    start_date = start.date() if hasattr(start, 'date') else start
    end_date = end.date() if hasattr(end, 'date') else end

    revenue_by_event = dict(
        Event.objects.filter(
            organization=organization,
            invoice__issue_date__gte=start,
            invoice__issue_date__lt=end,
        ).values_list('event_id', 'invoice__total_amount')
    )
    expenses_by_event = dict(
        ExpenseLineItem.objects.annotate(
            effective_date=Coalesce('date', Cast('created_at', DateField()))
        ).filter(
            event__organization=organization,
            effective_date__gte=start_date,
            effective_date__lt=end_date,
        ).values('event_id').annotate(total=Sum('amount')).values_list('event_id', 'total')
    )

    general_expenses_total = GeneralExpense.objects.annotate(
        effective_date=Coalesce('date', Cast('created_at', DateField()))
    ).filter(
        organization=organization,
        effective_date__gte=start_date,
        effective_date__lt=end_date,
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    total_revenue = sum(revenue_by_event.values(), Decimal('0'))
    total_project_expenses = sum(expenses_by_event.values(), Decimal('0'))

    total_profit = Decimal('0')
    total_loss = Decimal('0')
    for event_id in set(revenue_by_event) | set(expenses_by_event):
        net = (revenue_by_event.get(event_id) or Decimal('0')) - (expenses_by_event.get(event_id) or Decimal('0'))
        if net > 0:
            total_profit += net
        elif net < 0:
            total_loss += -net
    
    # Subtract general expenses from overall profit/loss
    net_overall = total_profit - total_loss - general_expenses_total
    if net_overall > 0:
        total_profit = net_overall
        total_loss = Decimal('0')
    else:
        total_profit = Decimal('0')
        total_loss = -net_overall

    return total_revenue, total_project_expenses, general_expenses_total, total_profit, total_loss


def _load_logo_flowable(organization, size=1.1 * inch):
    """Loads the organization's uploaded logo from local path or URL."""
    try:
        if not organization.company_logo:
            return None
        try:
            if hasattr(organization.company_logo, 'path'):
                path = organization.company_logo.path
                if os.path.exists(path):
                    return Image(path, size, size)
        except Exception:
            pass
        if hasattr(organization.company_logo, 'url'):
            url = organization.company_logo.url
            if url.startswith('http'):
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    image_stream = io.BytesIO(response.content)
                    return Image(image_stream, size, size)
    except Exception as e:
        print(f"Error loading logo: {e}")
    return None


CHECKLIST_TYPE_LABELS = {
    'pre_event': 'Pre-Event',
    'during_event': 'During Event',
    'post_event': 'Post-Event',
}


def generate_checklist_pdf(event, top_level_tasks):
    """
    Generates a PDF of an event's task checklist, grouped by checklist type,
    with subtasks indented beneath their parent.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=0.5 * inch, leftMargin=0.5 * inch, topMargin=0.5 * inch, bottomMargin=0.5 * inch)
    styles = getSampleStyleSheet()
    organization = event.organization

    title_style = ParagraphStyle(
        'TitleStyle', parent=styles['Heading1'], fontSize=24,
        textColor=colors.HexColor("#0f172a"), spaceAfter=6, fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'SubtitleStyle', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor("#64748b")
    )
    section_style = ParagraphStyle(
        'SectionStyle', parent=styles['Heading2'], fontSize=13,
        textColor=colors.white, fontName='Helvetica-Bold'
    )
    task_style = ParagraphStyle(
        'TaskStyle', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor("#0f172a"), leading=14
    )
    subtask_style = ParagraphStyle(
        'SubtaskStyle', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor("#334155"), leftIndent=16, leading=13
    )
    desc_style = ParagraphStyle(
        'DescStyle', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor("#64748b"), leftIndent=16
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
    top_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(top_table)
    elements.append(Spacer(1, 0.3 * inch))

    tasks_by_type = {'pre_event': [], 'during_event': [], 'post_event': []}
    for task in top_level_tasks:
        tasks_by_type.setdefault(task.checklist_type, []).append(task)

    for checklist_type in ['pre_event', 'during_event', 'post_event']:
        tasks = tasks_by_type.get(checklist_type, [])

        section_header = Table([[Paragraph(CHECKLIST_TYPE_LABELS[checklist_type], section_style)]], colWidths=[7.2 * inch])
        section_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor("#0f172a")),
            ('PADDING', (0, 0), (0, 0), 8),
        ]))
        elements.append(section_header)
        elements.append(Spacer(1, 0.1 * inch))

        if not tasks:
            elements.append(Paragraph("No tasks in this section.", subtitle_style))
        else:
            for task in tasks:
                box = "☑" if task.is_done else "☐"
                due = f" — Due {task.due_date.strftime('%b %d, %Y %H:%M')}" if task.due_date else ""
                elements.append(Paragraph(f"{box} {task.name}{due}", task_style))
                if task.description:
                    elements.append(Paragraph(task.description, desc_style))
                for sub in task.subtasks.all():
                    sub_box = "☑" if sub.is_done else "☐"
                    sub_due = f" — Due {sub.due_date.strftime('%b %d, %Y %H:%M')}" if sub.due_date else ""
                    elements.append(Paragraph(f"{sub_box} {sub.name}{sub_due}", subtask_style))
                    if sub.description:
                        elements.append(Paragraph(sub.description, desc_style))
        elements.append(Spacer(1, 0.25 * inch))

    small_style = ParagraphStyle(
        'SmallStyle', parent=styles['Normal'], fontSize=8,
        textColor=colors.HexColor("#94a3b8"), alignment=TA_CENTER
    )
    elements.append(Spacer(1, 0.2 * inch))
    elements.append(Paragraph("Powered by NeoOps", small_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
