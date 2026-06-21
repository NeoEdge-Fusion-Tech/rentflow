import io
import os
from decimal import Decimal
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.units import inch
from django.conf import settings
import requests
import json

def initialize_paystack_transaction(email, amount, booking_id):
    """
    Initializes a Paystack transaction and returns the authorization URL.
    Amount should be in Naira (will be converted to kobo for Paystack).
    """
    url = "https://api.paystack.co/transaction/initialize"
    headers = {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    data = {
        "email": email,
        "amount": int(float(amount) * 100), # Paystack amount is in kobo
        "metadata": {
            "booking_id": booking_id,
        },
        # You can add a callback_url here if needed
    }
    
    response = requests.post(url, headers=headers, data=json.dumps(data))
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Paystack initialization failed: {response.text}")

def compute_invoice_totals(line_items, discount_amount=0, discount_percentage=0, tax_percentage=0):
    """
    Computes (subtotal, discount_value, tax_amount, total_amount) as Decimals
    from a list of line items (dicts or InvoiceLineItem instances exposing
    `quantity`/`unit_price`) plus discount/tax inputs. Percentage discount
    wins over a flat amount when both are set, matching BookingSerializer's
    existing convention.
    """
    def _get(item, field):
        return item.get(field) if isinstance(item, dict) else getattr(item, field)

    subtotal = sum(
        (Decimal(str(_get(i, 'quantity') or 0)) * Decimal(str(_get(i, 'unit_price') or 0)) for i in line_items),
        Decimal('0')
    )

    discount_percentage = Decimal(str(discount_percentage or 0))
    discount_amount = Decimal(str(discount_amount or 0))
    if discount_percentage > 0:
        discount_value = subtotal * (discount_percentage / Decimal('100'))
    else:
        discount_value = discount_amount

    taxable_amount = max(Decimal('0'), subtotal - discount_value)
    tax_percentage = Decimal(str(tax_percentage or 0))
    tax_amount = taxable_amount * (tax_percentage / Decimal('100'))

    total_amount = max(Decimal('0'), taxable_amount + tax_amount)
    return subtotal, discount_value, tax_amount, total_amount


# ReportLab's built-in PDF fonts only support WinAnsiEncoding (~Latin-1), so most
# currency symbols (Naira, Rupee, Cedi, etc.) render as missing-glyph boxes. Fall
# back to the ISO currency code for anything outside this safe set.
_PDF_SAFE_CURRENCY_SYMBOLS = {'$', '£', '¥', '€', '¢'}


def _currency_label(currency):
    if not currency:
        return '$'
    if currency.symbol in _PDF_SAFE_CURRENCY_SYMBOLS:
        return currency.symbol
    return f"{currency.code} " if currency.code else (currency.symbol or '$')


def _load_logo_flowable(organization, size=1.1 * inch):
    """Loads the organization's uploaded logo, falling back to the bundled default."""
    try:
        if organization.company_logo and hasattr(organization.company_logo, 'path'):
            path = organization.company_logo.path
            if os.path.exists(path):
                return Image(path, size, size)
    except Exception:
        pass
    try:
        fallback = os.path.join(settings.BASE_DIR, 'static/images/logo.png')
        if os.path.exists(fallback):
            return Image(fallback, size, size)
    except Exception:
        pass
    return None


def generate_invoice_pdf(invoice):
    """
    Generates a branded PDF for an invoice, using the invoice's own line
    items, client, and organization details (not the linked booking).
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    organization = invoice.organization
    currency_symbol = _currency_label(invoice.currency or organization.currency)

    title_style = ParagraphStyle(
        'TitleStyle', parent=styles['Heading1'], fontSize=22,
        textColor=colors.HexColor("#1e293b"), spaceAfter=6
    )
    title_style_right = ParagraphStyle('TitleStyleRight', parent=title_style, alignment=TA_RIGHT)
    header_style = ParagraphStyle(
        'HeaderStyle', parent=styles['Normal'], fontSize=10,
        textColor=colors.HexColor("#64748b"), leading=14
    )
    header_style_right = ParagraphStyle('HeaderStyleRight', parent=header_style, alignment=TA_RIGHT)

    elements = []

    # ---- Header: "From" (organization) on the left, invoice meta on the right ----
    left_col = []
    logo = _load_logo_flowable(organization)
    if logo:
        left_col.append(logo)
        left_col.append(Spacer(1, 0.1 * inch))
    left_col.append(Paragraph(f"<b>{organization.name}</b>", styles['Normal']))
    if organization.address:
        left_col.append(Paragraph(organization.address.replace('\n', '<br/>'), header_style))
    if organization.phone_number:
        left_col.append(Paragraph(organization.phone_number, header_style))
    if organization.email:
        left_col.append(Paragraph(organization.email, header_style))
    if organization.tax_id:
        left_col.append(Paragraph(f"Tax ID: {organization.tax_id}", header_style))

    right_col = [Paragraph("INVOICE", title_style_right)]
    right_col.append(Paragraph(invoice.invoice_number, header_style_right))
    right_col.append(Paragraph(f"Issue Date: {invoice.issue_date.strftime('%Y-%m-%d')}", header_style_right))
    if invoice.due_date:
        right_col.append(Paragraph(f"Due Date: {invoice.due_date.strftime('%Y-%m-%d')}", header_style_right))
    right_col.append(Paragraph(f"Status: {invoice.get_status_display()}", header_style_right))

    header_table = Table([[left_col, right_col]], colWidths=[3.6 * inch, 3.4 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.4 * inch))

    # ---- Bill To ----
    elements.append(Paragraph("<b>Bill To:</b>", styles['Normal']))
    client = invoice.client
    if client:
        client_name = f"{client.first_name} {client.last_name}".strip()
        elements.append(Paragraph(client_name, styles['Normal']))
        if client.company_name:
            elements.append(Paragraph(client.company_name, header_style))
        if client.email:
            elements.append(Paragraph(client.email, header_style))
        if client.phone_number:
            elements.append(Paragraph(client.phone_number, header_style))
        if client.address:
            elements.append(Paragraph(client.address.replace('\n', '<br/>'), header_style))
    else:
        elements.append(Paragraph("No client specified", header_style))
    elements.append(Spacer(1, 0.35 * inch))

    # ---- Line Items ----
    data = [['Description', 'Qty', 'Unit Price', 'Total']]
    for item in invoice.line_items.all():
        data.append([
            item.description,
            f"{float(item.quantity):g}",
            f"{currency_symbol}{item.unit_price:,.2f}",
            f"{currency_symbol}{item.total:,.2f}"
        ])

    table = Table(data, colWidths=[3 * inch, 0.8 * inch, 1.3 * inch, 1.4 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 0.2 * inch))

    # ---- Totals ----
    totals_rows = [['', 'Subtotal:', f"{currency_symbol}{invoice.subtotal:,.2f}"]]
    if invoice.discount_percentage and invoice.discount_percentage > 0:
        discount_value = invoice.subtotal * (invoice.discount_percentage / Decimal('100'))
        totals_rows.append(['', f"Discount ({invoice.discount_percentage:g}%):", f"-{currency_symbol}{discount_value:,.2f}"])
    elif invoice.discount_amount and invoice.discount_amount > 0:
        totals_rows.append(['', 'Discount:', f"-{currency_symbol}{invoice.discount_amount:,.2f}"])
    if invoice.tax_percentage and invoice.tax_percentage > 0:
        totals_rows.append(['', f"Tax ({invoice.tax_percentage:g}%):", f"{currency_symbol}{invoice.tax_amount:,.2f}"])
    totals_rows.append(['', 'Total Amount:', f"{currency_symbol}{invoice.total_amount:,.2f}"])

    totals_table = Table(totals_rows, colWidths=[3.6 * inch, 1.5 * inch, 1.4 * inch])
    last_row = len(totals_rows) - 1
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (1, last_row), (-1, last_row), 'Helvetica-Bold'),
        ('FONTSIZE', (1, last_row), (-1, last_row), 12),
        ('LINEABOVE', (1, last_row), (-1, last_row), 0.75, colors.HexColor("#0f172a")),
        ('TOPPADDING', (1, last_row), (-1, last_row), 8),
    ]))
    elements.append(totals_table)

    # ---- Notes ----
    if invoice.notes:
        elements.append(Spacer(1, 0.4 * inch))
        elements.append(Paragraph("<b>Notes:</b>", styles['Normal']))
        elements.append(Paragraph(invoice.notes.replace('\n', '<br/>'), styles['Normal']))

    # ---- Payment Info (bank details): prefer the invoice's selected bank
    # account, falling back to the organization's legacy payout account ----
    bank_account = invoice.bank_account
    if bank_account:
        elements.append(Spacer(1, 0.3 * inch))
        elements.append(Paragraph("<b>Payment Info:</b>", styles['Normal']))
        elements.append(Paragraph(f"Bank: {bank_account.bank_name}", header_style))
        elements.append(Paragraph(f"Account Name: {bank_account.account_name}", header_style))
        elements.append(Paragraph(f"Account Number: {bank_account.account_number}", header_style))
        elements.append(Paragraph(f"Account Type: {bank_account.get_account_type_display()}", header_style))
    else:
        account_details = getattr(organization, 'account_details', None)
        if account_details and (account_details.account_number or account_details.bank_name):
            elements.append(Spacer(1, 0.3 * inch))
            elements.append(Paragraph("<b>Payment Info:</b>", styles['Normal']))
            if account_details.bank_name:
                elements.append(Paragraph(f"Bank: {account_details.bank_name}", header_style))
            if account_details.account_name:
                elements.append(Paragraph(f"Account Name: {account_details.account_name}", header_style))
            if account_details.account_number:
                elements.append(Paragraph(f"Account Number: {account_details.account_number}", header_style))

    elements.append(Spacer(1, 0.5 * inch))
    elements.append(Paragraph("Thank you for your business!", ParagraphStyle('CenterStyle', parent=styles['Normal'], alignment=TA_CENTER)))

    # Powered by NeoInventory footer
    small_style = ParagraphStyle(
        'SmallStyle', parent=styles['Normal'], fontSize=8,
        textColor=colors.HexColor("#94a3b8"), alignment=TA_CENTER
    )
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph("Powered by NeoInventory", small_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer

def generate_receipt_pdf(receipt):
    """
    Generates a PDF for a receipt.
    Includes amount paid, balance left, and payment status.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    organization = receipt.organization
    currency_symbol = _currency_label(organization.currency)

    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#10b981"), # Green for success/receipt
        spaceAfter=12
    )

    elements = []

    # Header
    elements.append(Paragraph(f"RECEIPT: {receipt.receipt_number}", title_style))
    elements.append(Paragraph(f"Organization: {organization.name}", styles['Normal']))
    elements.append(Paragraph(f"Date: {receipt.issue_date.strftime('%Y-%m-%d')}", styles['Normal']))
    elements.append(Spacer(1, 0.5 * inch))

    # Client Info
    elements.append(Paragraph("<b>Received From:</b>", styles['Normal']))
    client_name = f"{receipt.payment.booking.client.first_name} {receipt.payment.booking.client.last_name}"
    elements.append(Paragraph(client_name, styles['Normal']))
    elements.append(Spacer(1, 0.3 * inch))

    # Payment Details
    booking = receipt.payment.booking
    total_amount = booking.total_amount
    amount_paid_now = receipt.amount
    total_paid_to_date = booking.amount_paid
    balance_left = max(0, total_amount - total_paid_to_date)

    is_full_payment = total_paid_to_date >= total_amount
    payment_type = "Full Payment" if is_full_payment else "Partial Payment"

    data = [
        ['Description', 'Value'],
        ['Booking ID', f"#{booking.booking_id}"],
        ['Event Name', booking.event_name or 'N/A'],
        ['Payment Method', 'Completed Transaction'],
        ['Total Booking Amount', f"{currency_symbol}{total_amount:,.2f}"],
        ['Amount Paid in this Transaction', f"{currency_symbol}{amount_paid_now:,.2f}"],
        ['Total Amount Paid to Date', f"{currency_symbol}{total_paid_to_date:,.2f}"],
        ['Balance Remaining', f"{currency_symbol}{balance_left:,.2f}"],
        ['Payment Status', payment_type],
    ]

    table = Table(data, colWidths=[2.5 * inch, 3 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#ecfdf5")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#065f46")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#d1fae5")),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
    ]))
    elements.append(table)

    # Footer
    if receipt.notes:
        elements.append(Spacer(1, 0.5 * inch))
        elements.append(Paragraph("<b>Notes:</b>", styles['Normal']))
        elements.append(Paragraph(receipt.notes, styles['Normal']))

    elements.append(Spacer(1, 0.5 * inch))
    elements.append(Paragraph("Thank you for your business!", ParagraphStyle('CenterStyle', parent=styles['Normal'], alignment=TA_CENTER)))

    # Logo Footer
    logo = _load_logo_flowable(organization)
    if logo:
        elements.append(Spacer(1, 0.5 * inch))
        elements.append(logo)

    doc.build(elements)
    buffer.seek(0)
    return buffer
