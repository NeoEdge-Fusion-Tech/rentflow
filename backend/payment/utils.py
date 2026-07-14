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
        try:
            error_data = response.json()
            message = error_data.get('message', response.text)
        except Exception:
            message = response.text
            
        if "Invalid key" in message or "authorization key" in message.lower():
            raise ValueError("Payment gateway is not configured properly (Invalid API Key). Please update the `.env` file or contact support.")
            
        raise ValueError(f"Paystack Error: {message}")


def initialize_paystack_transaction_for_invoice(email, amount, invoice_id, invoice_number):
    """
    Initializes a Paystack transaction tied to an invoice (not a booking).
    Amount should be in Naira (will be converted to kobo for Paystack).
    Returns the full Paystack response dict.
    """
    url = "https://api.paystack.co/transaction/initialize"
    headers = {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    data = {
        "email": email,
        "amount": int(float(amount) * 100),  # convert to kobo
        "metadata": {
            "invoice_id": invoice_id,
            "invoice_number": invoice_number,
            "source": "invoice_payment_link",
        },
    }

    response = requests.post(url, headers=headers, data=json.dumps(data))
    if response.status_code == 200:
        return response.json()
    else:
        try:
            error_data = response.json()
            message = error_data.get('message', response.text)
        except Exception:
            message = response.text
            
        if "Invalid key" in message or "authorization key" in message.lower():
            raise ValueError("Payment gateway is not configured properly (Invalid API Key). Please update the `.env` file or contact support.")
            
        raise ValueError(f"Paystack Error: {message}")

def initialize_paystack_transaction_for_subscription(email, amount, organization_id, plan_name):
    """
    Initializes a Paystack transaction for SaaS subscription upgrade.
    Amount should be in Naira (will be converted to kobo for Paystack).
    """
    url = "https://api.paystack.co/transaction/initialize"
    headers = {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    data = {
        "email": email,
        "amount": int(float(amount) * 100),  # convert to kobo
        "metadata": {
            "source": "subscription_upgrade",
            "organization_id": organization_id,
            "plan_name": plan_name,
        },
    }

    response = requests.post(url, headers=headers, data=json.dumps(data))
    if response.status_code == 200:
        return response.json()
    else:
        try:
            error_data = response.json()
            message = error_data.get('message', response.text)
        except Exception:
            message = response.text
            
        if "Invalid key" in message or "authorization key" in message.lower():
            raise ValueError("Payment gateway is not configured properly (Invalid API Key). Please update the `.env` file or contact support.")
            
        raise ValueError(f"Paystack Error: {message}")
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
    return None


def generate_invoice_pdf(invoice):
    """
    Generates a branded PDF for an invoice, using the invoice's own line
    items, client, and organization details (not the linked booking).
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=0.5*inch, leftMargin=0.5*inch, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    organization = invoice.organization
    currency_symbol = _currency_label(invoice.currency or organization.currency)

    # Styles
    title_style = ParagraphStyle(
        'TitleStyle', parent=styles['Heading1'], fontSize=28,
        textColor=colors.HexColor("#0f172a"), spaceAfter=15, fontName='Helvetica-Bold'
    )
    meta_label_style = ParagraphStyle(
        'MetaLabel', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor("#64748b")
    )
    meta_val_style = ParagraphStyle(
        'MetaVal', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor("#0f172a"), fontName='Helvetica-Bold'
    )
    
    box_header_style = ParagraphStyle(
        'BoxHeader', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor("#64748b"), fontName='Helvetica-Bold', spaceAfter=6, textTransform='uppercase'
    )
    box_text_style = ParagraphStyle(
        'BoxText', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor("#334155"), leading=14
    )
    box_title_style = ParagraphStyle(
        'BoxTitle', parent=styles['Normal'], fontSize=12, textColor=colors.HexColor("#0f172a"), fontName='Helvetica-Bold', spaceAfter=4
    )

    elements = []

    # ---- Top Header ----
    left_meta = []
    left_meta.append([Paragraph("Invoice No #", meta_label_style), Paragraph(invoice.invoice_number, meta_val_style)])
    left_meta.append([Paragraph("Invoice Date", meta_label_style), Paragraph(invoice.issue_date.strftime('%b %d, %Y'), meta_val_style)])
    if invoice.due_date:
        left_meta.append([Paragraph("Due Date", meta_label_style), Paragraph(invoice.due_date.strftime('%b %d, %Y'), meta_val_style)])
    left_meta.append([Paragraph("Status", meta_label_style), Paragraph(f"<font color='#2563eb'>{invoice.get_status_display()}</font>", meta_val_style)])

    meta_table = Table(left_meta, colWidths=[1.2 * inch, 2.5 * inch])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))

    header_left = [Paragraph(invoice.title or "Invoice", title_style), meta_table]

    header_right = []
    logo = _load_logo_flowable(organization, size=1.4 * inch)
    if logo:
        header_right.append(logo)

    top_table = Table([[header_left, header_right]], colWidths=[5 * inch, 2.2 * inch])
    top_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(top_table)
    elements.append(Spacer(1, 0.4 * inch))

    # ---- Billed By / Billed To Boxes ----
    billed_by = [Paragraph("BILLED BY", box_header_style)]
    billed_by.append(Paragraph(organization.name, box_title_style))
    if organization.address:
        billed_by.append(Paragraph(organization.address.replace('\n', '<br/>'), box_text_style))
    if organization.phone_number:
        billed_by.append(Paragraph(organization.phone_number, box_text_style))
    if organization.email:
        billed_by.append(Paragraph(organization.email, box_text_style))

    billed_to = [Paragraph("BILLED TO", box_header_style)]
    client = invoice.client
    if client:
        client_name = f"{client.business_name}".strip()
        billed_to.append(Paragraph(client_name, box_title_style))
        if client.email:
            billed_to.append(Paragraph(client.email, box_text_style))
        if client.phone_number:
            billed_to.append(Paragraph(client.phone_number, box_text_style))
        if client.address:
            billed_to.append(Paragraph(client.address.replace('\n', '<br/>'), box_text_style))
    else:
        billed_to.append(Paragraph("No client specified", box_text_style))

    # Wrap in tables for gray background
    box_bg = colors.HexColor("#f1f5f9")
    by_table = Table([[billed_by]], colWidths=[3.5 * inch])
    by_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), box_bg),
        ('PADDING', (0, 0), (0, 0), 12),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
    ]))

    to_table = Table([[billed_to]], colWidths=[3.5 * inch])
    to_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), box_bg),
        ('PADDING', (0, 0), (0, 0), 12),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
    ]))

    info_table = Table([[by_table, '', to_table]], colWidths=[3.5 * inch, 0.2 * inch, 3.5 * inch])
    info_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.4 * inch))

    # ---- Line Items ----
    data = [['Item', 'Qty', 'Rate', 'Total']]
    for idx, item in enumerate(invoice.line_items.all()):
        item_text = f"<b>{idx + 1}. {item.name}</b>"
        if item.description:
            item_text += f"<br/><font color='#64748b' size='9'>{item.description}</font>"
        
        data.append([
            Paragraph(item_text, styles['Normal']),
            f"{float(item.quantity):g}",
            f"{currency_symbol}{item.unit_price:,.2f}",
            f"{currency_symbol}{item.total:,.2f}"
        ])

    table = Table(data, colWidths=[3.8 * inch, 0.8 * inch, 1.3 * inch, 1.3 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")), # Dark blue header
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 1), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 1), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 12),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 0.3 * inch))

    # ---- Payment Info & Totals ----
    bank_account = invoice.bank_account
    payment_info = [Paragraph("Payment Info", box_title_style)]
    if bank_account:
        payment_info.append(Paragraph(f"<font color='#64748b'>Bank:</font> {bank_account.bank_name}", box_text_style))
        payment_info.append(Paragraph(f"<font color='#64748b'>Account Name:</font> {bank_account.account_name}", box_text_style))
        payment_info.append(Paragraph(f"<font color='#64748b'>Account Number:</font> {bank_account.account_number}", box_text_style))
        if bank_account.account_type:
            payment_info.append(Paragraph(f"<font color='#64748b'>Account Type:</font> {bank_account.get_account_type_display()}", box_text_style))
        if bank_account.swift_code:
            payment_info.append(Paragraph(f"<font color='#64748b'>SWIFT:</font> {bank_account.swift_code}", box_text_style))
    else:
        # Fallback to org generic info
        acct_details = getattr(organization, 'account_details', None)
        if acct_details and acct_details.bank_name:
            payment_info.append(Paragraph(f"<font color='#64748b'>Bank:</font> {acct_details.bank_name}", box_text_style))
            payment_info.append(Paragraph(f"<font color='#64748b'>Account Name:</font> {acct_details.account_name}", box_text_style))
            payment_info.append(Paragraph(f"<font color='#64748b'>Account Number:</font> {acct_details.account_number}", box_text_style))
        else:
            payment_info.append(Paragraph("No payment details provided.", box_text_style))

    payment_table = Table([[payment_info]], colWidths=[4 * inch])
    payment_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor("#f8fafc")),
        ('PADDING', (0, 0), (0, 0), 12),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ('BORDER', (0, 0), (0, 0), 0.5, colors.HexColor("#e2e8f0")),
    ]))

    totals_rows = [
        [Paragraph("Subtotal", meta_label_style), Paragraph(f"{currency_symbol}{invoice.subtotal:,.2f}", ParagraphStyle('R', alignment=TA_RIGHT, fontSize=10))]
    ]
    if invoice.discount_percentage and invoice.discount_percentage > 0:
        discount_value = invoice.subtotal * (invoice.discount_percentage / Decimal('100'))
        totals_rows.append([Paragraph(f"Discount ({invoice.discount_percentage:g}%)", meta_label_style), Paragraph(f"-{currency_symbol}{discount_value:,.2f}", ParagraphStyle('R', alignment=TA_RIGHT, fontSize=10))])
    elif invoice.discount_amount and invoice.discount_amount > 0:
        totals_rows.append([Paragraph("Discount", meta_label_style), Paragraph(f"-{currency_symbol}{invoice.discount_amount:,.2f}", ParagraphStyle('R', alignment=TA_RIGHT, fontSize=10))])
    
    if invoice.tax_percentage and invoice.tax_percentage > 0:
        totals_rows.append([Paragraph(f"Tax ({invoice.tax_percentage:g}%)", meta_label_style), Paragraph(f"{currency_symbol}{invoice.tax_amount:,.2f}", ParagraphStyle('R', alignment=TA_RIGHT, fontSize=10))])
    
    totals_rows.append([Paragraph("Total (<b>" + (currency_symbol or '') + "</b>)", meta_val_style), Paragraph(f"<b>{currency_symbol}{invoice.total_amount:,.2f}</b>", ParagraphStyle('R', alignment=TA_RIGHT, fontSize=12))])

    totals_table = Table(totals_rows, colWidths=[1.5 * inch, 1.5 * inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('LINEABOVE', (0, -1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, -1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))

    bottom_table = Table([[payment_table, totals_table]], colWidths=[4.2 * inch, 3.0 * inch])
    bottom_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(bottom_table)

    # ---- Notes ----
    if invoice.notes:
        elements.append(Spacer(1, 0.4 * inch))
        elements.append(Paragraph("<b>Notes:</b>", box_title_style))
        elements.append(Paragraph(invoice.notes.replace('\n', '<br/>'), box_text_style))

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
    client_name = f"{receipt.payment.booking.client.business_name}"
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
