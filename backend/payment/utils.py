import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
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

def generate_invoice_pdf(invoice):
    """
    Generates a PDF for an invoice.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=12
    )
    
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#64748b")
    )

    elements = []

    # Header
    elements.append(Paragraph(f"INVOICE: {invoice.invoice_number}", title_style))
    elements.append(Paragraph(f"Organization: {invoice.organization.name}", header_style))
    elements.append(Paragraph(f"Date: {invoice.issue_date.strftime('%Y-%m-%d')}", header_style))
    if invoice.due_date:
        elements.append(Paragraph(f"Due Date: {invoice.due_date.strftime('%Y-%m-%d')}", header_style))
    elements.append(Spacer(1, 0.5 * inch))

    # Client Info
    elements.append(Paragraph("<b>Bill To:</b>", styles['Normal']))
    client_name = f"{invoice.booking.client.first_name} {invoice.booking.client.last_name}"
    elements.append(Paragraph(client_name, styles['Normal']))
    if invoice.booking.client.email:
        elements.append(Paragraph(invoice.booking.client.email, styles['Normal']))
    if invoice.booking.client.phone_number:
        elements.append(Paragraph(invoice.booking.client.phone_number, styles['Normal']))
    elements.append(Spacer(1, 0.3 * inch))

    # Items Table
    data = [['Item', 'Quantity', 'Unit Price', 'Total']]
    for item in invoice.booking.items.all():
        data.append([
            item.product.name,
            str(item.quantity_booked),
            f"${item.unit_price:,.2f}",
            f"${item.total_price:,.2f}"
        ])

    table = Table(data, colWidths=[3 * inch, 0.8 * inch, 1 * inch, 1.2 * inch])
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

    # Totals
    totals_data = [
        ['', 'Total Amount:', f"${invoice.total_amount:,.2f}"],
    ]
    totals_table = Table(totals_data, colWidths=[3.8 * inch, 1 * inch, 1.2 * inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
    ]))
    elements.append(totals_table)

    # Footer
    if invoice.notes:
        elements.append(Spacer(1, 0.5 * inch))
        elements.append(Paragraph("<b>Notes:</b>", styles['Normal']))
        elements.append(Paragraph(invoice.notes, styles['Normal']))

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
    elements.append(Paragraph(f"Organization: {receipt.organization.name}", styles['Normal']))
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
        ['Total Booking Amount', f"${total_amount:,.2f}"],
        ['Amount Paid in this Transaction', f"${amount_paid_now:,.2f}"],
        ['Total Amount Paid to Date', f"${total_paid_to_date:,.2f}"],
        ['Balance Remaining', f"${balance_left:,.2f}"],
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

    elements.append(Spacer(1, 1 * inch))
    elements.append(Paragraph("Thank you for your business!", ParagraphStyle('CenterStyle', parent=styles['Normal'], alignment=1)))

    doc.build(elements)
    buffer.seek(0)
    return buffer
