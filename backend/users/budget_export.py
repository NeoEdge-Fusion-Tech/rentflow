import io
import csv
from datetime import datetime
from decimal import Decimal
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    HRFlowable,
)
from reportlab.lib.units import inch

_PDF_SAFE_CURRENCY_SYMBOLS = {"$", "£", "¥", "€", "¢"}


def _get_pdf_currency(symbol, code):
    if symbol in _PDF_SAFE_CURRENCY_SYMBOLS:
        return symbol
    return f"{code} " if code else (symbol or "$ ")


def _fmt(val, curr_prefix=""):
    try:
        num = float(val)
        return f"{curr_prefix}{num:,.2f}"
    except Exception:
        return f"{curr_prefix}0.00"


def generate_budget_calculator_pdf(data):
    """
    Generates a PDF report for the Event Budget & Profit Calculator.
    data dict contains:
      - client_price: float
      - currency_code: str (e.g. 'NGN', 'USD')
      - currency_symbol: str (e.g. '₦', '$')
      - costs: list of {"name": str, "amount": float}
      - contingency_percent: float (default 10)
      - target_margin_percent: float (default 30)
      - user_info: dict with first_name, last_name, company, email (optional)
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    currency_code = data.get("currency_code", "NGN")
    currency_symbol = data.get("currency_symbol", "₦")
    pdf_curr = _get_pdf_currency(currency_symbol, currency_code)

    client_price = float(data.get("client_price", 0))
    costs_list = data.get("costs", [])
    contingency_percent = float(data.get("contingency_percent", 10))
    target_margin_percent = float(data.get("target_margin_percent", 30))

    direct_costs = sum(float(item.get("amount", 0)) for item in costs_list)
    contingency_amount = direct_costs * (contingency_percent / 100.0)
    total_costs = direct_costs + contingency_amount
    profit = client_price - total_costs
    margin_percent = (profit / client_price * 100.0) if client_price > 0 else 0.0

    target_divider = 1.0 - (target_margin_percent / 100.0)
    target_price = (total_costs / target_divider) if target_divider > 0 else total_costs

    user_info = data.get("user_info") or {}
    first_name = user_info.get("first_name", "").strip()
    last_name = user_info.get("last_name", "").strip()
    full_name = f"{first_name} {last_name}".strip()
    company = user_info.get("company", "").strip()
    email = user_info.get("email", "").strip()

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#07294C"),
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#4A5663"),
    )

    badge_style = ParagraphStyle(
        "DocBadge",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#07294C"),
        alignment=TA_RIGHT,
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#07294C"),
        spaceAfter=6,
    )

    cell_style = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0A0D12"),
    )

    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#07294C"),
    )

    cell_right = ParagraphStyle(
        "CellRight",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#0A0D12"),
    )

    cell_right_bold = ParagraphStyle(
        "CellRightBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#07294C"),
    )

    profit_color = "#16A34A" if profit >= 0 else "#DC2626"
    cell_profit = ParagraphStyle(
        "CellProfit",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        alignment=TA_RIGHT,
        textColor=colors.HexColor(profit_color),
    )

    story = []

    # Header Row
    header_data = [
        [
            Paragraph("NeoOps <font color='#FFC17D'>BY NEOEDGE</font>", title_style),
            Paragraph(
                f"Generated: {datetime.now().strftime('%B %d, %Y')}<br/>"
                f"<font color='#6B7280'>Event Budget & Profit Report</font>",
                badge_style,
            ),
        ]
    ]
    t_header = Table(header_data, colWidths=[3.5 * inch, 3.8 * inch])
    t_header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(t_header)
    story.append(Spacer(1, 12))
    story.append(
        HRFlowable(
            width="100%",
            thickness=1.5,
            color=colors.HexColor("#E2E8F0"),
            spaceBefore=0,
            spaceAfter=14,
        )
    )

    # Lead / Client info box if available
    if company or full_name or email:
        info_lines = []
        if company:
            info_lines.append(f"<b>Company:</b> {company}")
        if full_name:
            info_lines.append(f"<b>Contact:</b> {full_name}")
        if email:
            info_lines.append(f"<b>Email:</b> {email}")
        info_html = " &nbsp;&nbsp;|&nbsp;&nbsp; ".join(info_lines)
        t_info = Table(
            [[Paragraph(f"Prepared For: {info_html}", cell_style)]],
            colWidths=[7.3 * inch],
        )
        t_info.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(t_info)
        story.append(Spacer(1, 14))

    # Executive Summary Card
    story.append(Paragraph("Executive Financial Summary", section_heading))
    margin_label = (
        "Healthy margin"
        if margin_percent >= 20
        else (
            "Moderate margin" if margin_percent >= 10 else "Low margin / Review quote"
        )
    )

    summary_rows = [
        [
            Paragraph("What Client Pays You", cell_bold),
            Paragraph(_fmt(client_price, pdf_curr), cell_right_bold),
            Paragraph("Direct Event Costs", cell_bold),
            Paragraph(_fmt(direct_costs, pdf_curr), cell_right_bold),
        ],
        [
            Paragraph(f"Contingency ({contingency_percent:.0f}%)", cell_style),
            Paragraph(_fmt(contingency_amount, pdf_curr), cell_right),
            Paragraph("Total Event Costs", cell_bold),
            Paragraph(_fmt(total_costs, pdf_curr), cell_right_bold),
        ],
        [
            Paragraph("Projected Net Profit", cell_bold),
            Paragraph(_fmt(profit, pdf_curr), cell_profit),
            Paragraph("Profit Margin", cell_bold),
            Paragraph(f"{margin_percent:.1f}% ({margin_label})", cell_right_bold),
        ],
        [
            Paragraph(
                f"Recommended Price ({target_margin_percent:.0f}% Target Margin)",
                cell_bold,
            ),
            Paragraph(_fmt(target_price, pdf_curr), cell_right_bold),
            Paragraph("Currency", cell_style),
            Paragraph(f"{currency_code} ({currency_symbol})", cell_right),
        ],
    ]
    t_summary = Table(
        summary_rows,
        colWidths=[2.2 * inch, 1.45 * inch, 2.2 * inch, 1.45 * inch],
    )
    t_summary.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5FA")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(t_summary)
    story.append(Spacer(1, 18))

    # Cost Breakdown Table
    story.append(Paragraph("Cost Breakdown", section_heading))
    breakdown_data = [
        [
            Paragraph("<b>Cost Category</b>", cell_bold),
            Paragraph("<b>Amount</b>", cell_right_bold),
            Paragraph("<b>% of Direct Costs</b>", cell_right_bold),
        ]
    ]

    for item in costs_list:
        c_name = item.get("name", "Cost Item")
        c_amt = float(item.get("amount", 0))
        pct = (c_amt / direct_costs * 100.0) if direct_costs > 0 else 0.0
        breakdown_data.append(
            [
                Paragraph(c_name, cell_style),
                Paragraph(_fmt(c_amt, pdf_curr), cell_right),
                Paragraph(f"{pct:.1f}%", cell_right),
            ]
        )

    # Subtotals & Totals
    breakdown_data.append(
        [
            Paragraph("<b>Total Direct Costs</b>", cell_bold),
            Paragraph(_fmt(direct_costs, pdf_curr), cell_right_bold),
            Paragraph("100.0%", cell_right_bold),
        ]
    )
    breakdown_data.append(
        [
            Paragraph(
                f"<b>Contingency Reserve ({contingency_percent:.0f}%)</b>", cell_bold
            ),
            Paragraph(_fmt(contingency_amount, pdf_curr), cell_right_bold),
            Paragraph(f"{contingency_percent:.1f}%", cell_right),
        ]
    )
    breakdown_data.append(
        [
            Paragraph("<b>Total Event Budget Required</b>", cell_bold),
            Paragraph(_fmt(total_costs, pdf_curr), cell_right_bold),
            Paragraph("-", cell_right),
        ]
    )

    t_breakdown = Table(
        breakdown_data,
        colWidths=[4.1 * inch, 1.8 * inch, 1.4 * inch],
    )
    t_breakdown.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#07294C")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -4),
                    [colors.white, colors.HexColor("#F8FAFC")],
                ),
                ("BACKGROUND", (0, -3), (-1, -1), colors.HexColor("#F1F5FA")),
                ("TOPPADDING", (0, 1), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(t_breakdown)
    story.append(Spacer(1, 22))

    # Explanatory Callout Box
    note_p = Paragraph(
        "<b>NeoOps Event Operations Tip:</b> NeoOps Premium tracks these costs automatically "
        "against real invoices, vendor receipts, and crew logistics in real time. "
        "Always build in at least 10% contingency to safeguard your event margins.",
        cell_style,
    )
    t_note = Table([[note_p]], colWidths=[7.3 * inch])
    t_note.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7ED")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#FFC17D")),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(t_note)
    story.append(Spacer(1, 20))

    # Footer note
    footer_p = Paragraph(
        "<font color='#64748B' size='8'>NeoOps by NeoEdge &bull; Event Operations & Inventory SaaS &bull; "
        "Visit <font color='#07294C'><b>neoedgefusion.com</b></font> to start for free.</font>",
        ParagraphStyle("Foot", parent=styles["Normal"], alignment=TA_CENTER),
    )
    story.append(footer_p)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def generate_budget_calculator_csv(data):
    """
    Generates a CSV / Excel compatible text spreadsheet for event budget.
    """
    output = io.StringIO()
    # Write UTF-8 BOM so Excel opens it with proper encoding
    output.write("\ufeff")
    writer = csv.writer(output)

    currency_code = data.get("currency_code", "NGN")
    currency_symbol = data.get("currency_symbol", "₦")
    client_price = float(data.get("client_price", 0))
    costs_list = data.get("costs", [])
    contingency_percent = float(data.get("contingency_percent", 10))
    target_margin_percent = float(data.get("target_margin_percent", 30))

    direct_costs = sum(float(item.get("amount", 0)) for item in costs_list)
    contingency_amount = direct_costs * (contingency_percent / 100.0)
    total_costs = direct_costs + contingency_amount
    profit = client_price - total_costs
    margin_percent = (profit / client_price * 100.0) if client_price > 0 else 0.0

    target_divider = 1.0 - (target_margin_percent / 100.0)
    target_price = (total_costs / target_divider) if target_divider > 0 else total_costs

    user_info = data.get("user_info") or {}
    first_name = user_info.get("first_name", "").strip()
    last_name = user_info.get("last_name", "").strip()
    full_name = f"{first_name} {last_name}".strip()
    company = user_info.get("company", "").strip()
    email = user_info.get("email", "").strip()

    writer.writerow(["NeoOps - Event Budget & Profit Calculator Report"])
    writer.writerow(["Generated At", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    if company or full_name or email:
        writer.writerow(
            [
                "Prepared For",
                company or full_name,
                f"Contact: {full_name}",
                f"Email: {email}",
            ]
        )
    writer.writerow([])

    writer.writerow(["EXECUTIVE FINANCIAL SUMMARY"])
    writer.writerow(["Metric", "Amount", "Currency", "Notes"])
    writer.writerow(
        [
            "What Client Pays You",
            f"{client_price:,.2f}",
            currency_code,
            "Quoted Revenue",
        ]
    )
    writer.writerow(
        [
            "Direct Event Costs",
            f"{direct_costs:,.2f}",
            currency_code,
            "Sum of vendor and operational items",
        ]
    )
    writer.writerow(
        [
            f"Contingency ({contingency_percent:.0f}%)",
            f"{contingency_amount:,.2f}",
            currency_code,
            "Safety buffer",
        ]
    )
    writer.writerow(
        [
            "Total Event Costs",
            f"{total_costs:,.2f}",
            currency_code,
            "Direct costs + contingency",
        ]
    )
    writer.writerow(
        [
            "Projected Net Profit",
            f"{profit:,.2f}",
            currency_code,
            "Revenue minus Total Costs",
        ]
    )
    writer.writerow(
        ["Profit Margin %", f"{margin_percent:.2f}%", "", "Healthy margin: >= 20%"]
    )
    writer.writerow(
        [
            f"Recommended Price ({target_margin_percent:.0f}% Target Margin)",
            f"{target_price:,.2f}",
            currency_code,
            "Formula: Total Costs / (1 - Target Margin)",
        ]
    )
    writer.writerow([])

    writer.writerow(["COST BREAKDOWN"])
    writer.writerow(["Cost Category", "Amount", "Currency", "% of Direct Costs"])
    for item in costs_list:
        c_name = item.get("name", "Cost Item")
        c_amt = float(item.get("amount", 0))
        pct = (c_amt / direct_costs * 100.0) if direct_costs > 0 else 0.0
        writer.writerow([c_name, f"{c_amt:,.2f}", currency_code, f"{pct:.2f}%"])

    writer.writerow([])
    writer.writerow(
        ["Subtotal (Direct Costs)", f"{direct_costs:,.2f}", currency_code, "100.00%"]
    )
    writer.writerow(
        [
            f"Contingency ({contingency_percent:.0f}%)",
            f"{contingency_amount:,.2f}",
            currency_code,
            f"{contingency_percent:.2f}%",
        ]
    )
    writer.writerow(["Total Event Costs", f"{total_costs:,.2f}", currency_code, ""])
    writer.writerow([])
    writer.writerow(["NeoOps - From moments to memories. From ideas to systems."])

    return output.getvalue().encode("utf-8")
