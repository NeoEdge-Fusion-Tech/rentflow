import html
import io
import os
import re
from loguru import logger
from decimal import Decimal
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    Image,
)
from reportlab.lib.units import inch
from django.conf import settings
from django.db.models import Q as models_Q
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
        "amount": int(float(amount) * 100),  # Paystack amount is in kobo
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
            message = error_data.get("message", response.text)
        except Exception:
            message = response.text

        if "Invalid key" in message or "authorization key" in message.lower():
            raise ValueError(
                "Payment gateway is not configured properly (Invalid API Key). Please update the `.env` file or contact support."
            )

        raise ValueError(f"Paystack Error: {message}")


def initialize_paystack_transaction_for_invoice(
    email, amount, invoice_id, invoice_number
):
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
            message = error_data.get("message", response.text)
        except Exception:
            message = response.text

        if "Invalid key" in message or "authorization key" in message.lower():
            raise ValueError(
                "Payment gateway is not configured properly (Invalid API Key). Please update the `.env` file or contact support."
            )

        raise ValueError(f"Paystack Error: {message}")


def initialize_paystack_transaction_for_subscription(
    email, amount, organization_id, plan_name
):
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
            message = error_data.get("message", response.text)
        except Exception:
            message = response.text

        if "Invalid key" in message or "authorization key" in message.lower():
            raise ValueError(
                "Payment gateway is not configured properly (Invalid API Key). Please update the `.env` file or contact support."
            )

        raise ValueError(f"Paystack Error: {message}")


def compute_invoice_totals(
    line_items, discount_amount=0, discount_percentage=0, tax_percentage=0
):
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
        (
            Decimal(str(_get(i, "quantity") or 0))
            * Decimal(str(_get(i, "unit_price") or 0))
            for i in line_items
        ),
        Decimal("0"),
    )

    discount_percentage = Decimal(str(discount_percentage or 0))
    discount_amount = Decimal(str(discount_amount or 0))
    if discount_percentage > 0:
        discount_value = subtotal * (discount_percentage / Decimal("100"))
    else:
        discount_value = discount_amount

    taxable_amount = max(Decimal("0"), subtotal - discount_value)
    tax_percentage = Decimal(str(tax_percentage or 0))
    tax_amount = taxable_amount * (tax_percentage / Decimal("100"))

    total_amount = max(Decimal("0"), taxable_amount + tax_amount)
    return subtotal, discount_value, tax_amount, total_amount


# ReportLab's built-in PDF fonts only support WinAnsiEncoding (~Latin-1), so most
# currency symbols (Naira, Rupee, Cedi, etc.) render as missing-glyph boxes. Fall
# back to the ISO currency code for anything outside this safe set.
_PDF_SAFE_CURRENCY_SYMBOLS = {"$", "£", "¥", "€", "¢"}


def _currency_label(currency):
    if not currency:
        return "$"
    if currency.symbol in _PDF_SAFE_CURRENCY_SYMBOLS:
        return currency.symbol
    return f"{currency.code} " if currency.code else (currency.symbol or "$")


def _load_logo_flowable(organization, size=1.1 * inch):
    """Loads the organization's uploaded logo from local path or URL."""
    try:
        from reportlab.platypus import Image as RLImage

        if not organization.company_logo:
            return None

        # Try local file path first (works when MEDIA_ROOT is used)
        try:
            if hasattr(organization.company_logo, "path"):
                path = organization.company_logo.path
                if os.path.exists(path):
                    return RLImage(path, size, size)
        except Exception:
            pass

        # Fallback to URL (Cloudinary, S3, etc)
        if hasattr(organization.company_logo, "url"):
            url = organization.company_logo.url

            # Normalise protocol-relative URLs (//res.cloudinary.com/...)
            if url.startswith("//"):
                url = "https:" + url

            if url.startswith("http"):
                # Cache the downloaded logo in /tmp to avoid ReportLab BytesIO EOF bugs
                # Hash the URL to ensure we download a new logo if the URL changes
                import hashlib

                url_hash = hashlib.md5(url.encode("utf-8")).hexdigest()
                tmp_logo_path = f"/tmp/org_logo_{organization.id}_{url_hash}.png"

                # Check if file exists and has content
                if (
                    not os.path.exists(tmp_logo_path)
                    or os.path.getsize(tmp_logo_path) == 0
                ):
                    headers = {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                    }
                    response = requests.get(url, timeout=10, headers=headers)
                    if response.status_code == 200:
                        with open(tmp_logo_path, "wb") as f:
                            f.write(response.content)
                    else:
                        from reportlab.platypus import Paragraph
                        from reportlab.lib.styles import getSampleStyleSheet

                        return Paragraph(
                            f"HTTP {response.status_code}",
                            getSampleStyleSheet()["Normal"],
                        )

                if os.path.exists(tmp_logo_path) and os.path.getsize(tmp_logo_path) > 0:
                    return RLImage(tmp_logo_path, size, size)
            else:
                # Relative local URL — resolve via MEDIA_ROOT
                from django.conf import settings as django_settings

                relative = url.lstrip("/")
                media_root = str(getattr(django_settings, "MEDIA_ROOT", ""))
                # Strip the MEDIA_URL prefix if present
                media_url_prefix = getattr(
                    django_settings, "MEDIA_URL", "/media/"
                ).lstrip("/")
                if relative.startswith(media_url_prefix):
                    relative = relative[len(media_url_prefix) :]
                local_path = os.path.join(media_root, relative)
                if os.path.exists(local_path):
                    return RLImage(local_path, size, size)
    except Exception as e:
        print(f"Error loading logo: {e}")
        import traceback

        tb = traceback.format_exc()

        from reportlab.platypus import Paragraph
        from reportlab.lib.styles import getSampleStyleSheet

        return Paragraph(
            f"Logo Err: {e}<br/>{tb[:500]}", getSampleStyleSheet()["Normal"]
        )

    return None


def _build_billed_to_box(
    doc, box_header_style, box_title_style, box_text_style, header_title="BILLED TO"
):
    """
    Builds the 'BILLED TO' / 'QUOTE TO' flowables list for an invoice or quotation,
    intelligently resolving the client from the document or its linked booking,
    and handling individual clients, businesses, contact names, and addresses.
    """
    client = getattr(doc, "client", None)
    booking = getattr(doc, "booking", None)
    if not client and booking is not None:
        client = getattr(booking, "client", None)

    billed_to = [Paragraph(html.escape(header_title), box_header_style)]

    client_name = None
    contact_name = None
    email = None
    phone = None
    address_lines = []

    if client:
        is_individual = getattr(client, "client_type", None) == "individual"
        full_name = f"{client.first_name or ''} {client.last_name or ''}".strip()
        biz_name = (client.business_name or "").strip()
        if biz_name.lower() == "none":
            biz_name = ""
        contact = (client.contact_name or "").strip()
        if contact.lower() == "none":
            contact = ""

        if is_individual:
            client_name = full_name or biz_name or contact or client.email
        else:
            client_name = biz_name or full_name or contact or client.email
            if contact and contact.lower() != (client_name or "").lower():
                contact_name = contact
            elif full_name and full_name.lower() != (client_name or "").lower():
                contact_name = full_name

        email = client.email or client.contact_email
        phone = client.phone_number or client.contact_phone

        if client.address and client.address.strip():
            address_lines.append(client.address.strip())

        region = ", ".join(
            p
            for p in [client.city, client.state, client.country]
            if p and str(p).strip()
        )
        if region:
            if not client.address or region.lower() not in client.address.lower():
                address_lines.append(region)

    # Fallbacks from linked booking if fields are missing
    if booking:
        if not client_name and booking.contact_name:
            client_name = booking.contact_name.strip()
        elif not contact_name and booking.contact_name:
            b_contact = booking.contact_name.strip()
            if b_contact.lower() != (client_name or "").lower():
                contact_name = b_contact

        if not phone and booking.contact_phone:
            phone = booking.contact_phone.strip()

        if not address_lines:
            if booking.address and booking.address.strip():
                address_lines.append(booking.address.strip())
            b_region = ", ".join(
                p for p in [booking.city, booking.country] if p and str(p).strip()
            )
            if b_region:
                if (
                    not booking.address
                    or b_region.lower() not in booking.address.lower()
                ):
                    address_lines.append(b_region)

    if client_name:
        billed_to.append(Paragraph(html.escape(client_name), box_title_style))
        if contact_name:
            billed_to.append(
                Paragraph(f"Attn: {html.escape(contact_name)}", box_text_style)
            )
        if email:
            billed_to.append(Paragraph(html.escape(email), box_text_style))
        if phone:
            billed_to.append(Paragraph(html.escape(phone), box_text_style))
        if address_lines:
            formatted_address = "<br/>".join(
                html.escape(line).replace("\n", "<br/>") for line in address_lines
            )
            billed_to.append(Paragraph(formatted_address, box_text_style))
    else:
        billed_to.append(Paragraph("No client specified", box_text_style))

    return billed_to


def generate_invoice_pdf(invoice):
    """
    Generates a branded PDF for an invoice, using the invoice's own line
    items, client, and organization details (not the linked booking).
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
    organization = invoice.organization
    currency_symbol = _currency_label(invoice.currency or organization.currency)

    # Styles
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Heading1"],
        fontSize=28,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=15,
        fontName="Helvetica-Bold",
    )
    meta_label_style = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
    )
    meta_val_style = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
    )

    box_header_style = ParagraphStyle(
        "BoxHeader",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#64748b"),
        fontName="Helvetica-Bold",
        spaceAfter=6,
        textTransform="uppercase",
    )
    box_text_style = ParagraphStyle(
        "BoxText",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#334155"),
        leading=14,
    )
    box_title_style = ParagraphStyle(
        "BoxTitle",
        parent=styles["Normal"],
        fontSize=12,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
        spaceAfter=4,
    )

    elements = []

    # ---- Top Header ----
    left_meta = []
    left_meta.append(
        [
            Paragraph("Invoice No #", meta_label_style),
            Paragraph(invoice.invoice_number, meta_val_style),
        ]
    )
    left_meta.append(
        [
            Paragraph("Invoice Date", meta_label_style),
            Paragraph(invoice.issue_date.strftime("%b %d, %Y"), meta_val_style),
        ]
    )
    if invoice.due_date:
        left_meta.append(
            [
                Paragraph("Due Date", meta_label_style),
                Paragraph(invoice.due_date.strftime("%b %d, %Y"), meta_val_style),
            ]
        )
    status_color = "#16a34a" if invoice.status == "paid" else "#2563eb"
    left_meta.append(
        [
            Paragraph("Status", meta_label_style),
            Paragraph(
                f"<font color='{status_color}'>{invoice.get_status_display()}</font>",
                meta_val_style,
            ),
        ]
    )

    meta_table = Table(left_meta, colWidths=[1.2 * inch, 2.5 * inch])
    meta_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    header_left = [Paragraph(invoice.title or "Invoice", title_style), meta_table]

    # Build the right-side header cell — wrap logo in a nested table
    # so ReportLab right-aligns it correctly and the Image is eagerly resolved.
    logo = _load_logo_flowable(organization, size=1.4 * inch)
    if logo:
        logo_table = Table([[logo]], colWidths=[2.2 * inch])
        logo_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (0, 0), "RIGHT"),
                    ("VALIGN", (0, 0), (0, 0), "TOP"),
                ]
            )
        )
        header_right = logo_table
    else:
        header_right = Spacer(1, 1)

    top_table = Table([[header_left, header_right]], colWidths=[5 * inch, 2.2 * inch])
    top_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    elements.append(top_table)
    elements.append(Spacer(1, 0.4 * inch))

    # ---- Billed By / Billed To Boxes ----
    billed_by = [Paragraph("BILLED BY", box_header_style)]
    billed_by.append(Paragraph(html.escape(organization.name), box_title_style))
    if organization.address:
        billed_by.append(
            Paragraph(
                html.escape(organization.address).replace("\n", "<br/>"),
                box_text_style,
            )
        )
    if organization.phone_number:
        billed_by.append(
            Paragraph(html.escape(organization.phone_number), box_text_style)
        )
    if organization.email:
        billed_by.append(Paragraph(html.escape(organization.email), box_text_style))

    billed_to = _build_billed_to_box(
        invoice, box_header_style, box_title_style, box_text_style, "BILLED TO"
    )

    # Wrap in tables for gray background
    box_bg = colors.HexColor("#f1f5f9")
    by_table = Table([[billed_by]], colWidths=[3.5 * inch])
    by_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), box_bg),
                ("PADDING", (0, 0), (0, 0), 12),
                ("ROUNDEDCORNERS", [8, 8, 8, 8]),
            ]
        )
    )

    to_table = Table([[billed_to]], colWidths=[3.5 * inch])
    to_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), box_bg),
                ("PADDING", (0, 0), (0, 0), 12),
                ("ROUNDEDCORNERS", [8, 8, 8, 8]),
            ]
        )
    )

    info_table = Table(
        [[by_table, "", to_table]], colWidths=[3.5 * inch, 0.2 * inch, 3.5 * inch]
    )
    info_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.4 * inch))

    # ---- Line Items ----
    data = [["Item", "Qty", "Rate", "Total"]]
    for idx, item in enumerate(invoice.line_items.all()):
        item_text = f"<b>{idx + 1}. {item.name}</b>"
        if item.description:
            item_text += (
                f"<br/><font color='#64748b' size='9'>{item.description}</font>"
            )

        data.append(
            [
                Paragraph(item_text, styles["Normal"]),
                f"{float(item.quantity):g}",
                f"{currency_symbol}{item.unit_price:,.2f}",
                f"{currency_symbol}{item.total:,.2f}",
            ]
        )

    table = Table(data, colWidths=[3.8 * inch, 0.8 * inch, 1.3 * inch, 1.3 * inch])
    table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#0f172a"),
                ),  # Dark blue header
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                ("TOPPADDING", (0, 0), (-1, 0), 10),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("LINEBELOW", (0, 1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 1), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 1), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 12),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 0.3 * inch))

    # ---- Payment Info & Totals ----
    show_bank_details = getattr(invoice, "show_bank_details", True)
    payment_table = None
    if show_bank_details:
        bank_account = invoice.bank_account
        payment_info = [Paragraph("Payment Info", box_title_style)]
        if bank_account:
            payment_info.append(
                Paragraph(
                    f"<font color='#64748b'>Bank:</font> {bank_account.bank_name}",
                    box_text_style,
                )
            )
            payment_info.append(
                Paragraph(
                    f"<font color='#64748b'>Account Name:</font> {bank_account.account_name}",
                    box_text_style,
                )
            )
            payment_info.append(
                Paragraph(
                    f"<font color='#64748b'>Account Number:</font> {bank_account.account_number}",
                    box_text_style,
                )
            )
            if bank_account.account_type:
                payment_info.append(
                    Paragraph(
                        f"<font color='#64748b'>Account Type:</font> {bank_account.get_account_type_display()}",
                        box_text_style,
                    )
                )
            if bank_account.swift_code:
                payment_info.append(
                    Paragraph(
                        f"<font color='#64748b'>SWIFT:</font> {bank_account.swift_code}",
                        box_text_style,
                    )
                )
        else:
            # Fallback to org generic info
            acct_details = getattr(organization, "account_details", None)
            if acct_details and acct_details.bank_name:
                payment_info.append(
                    Paragraph(
                        f"<font color='#64748b'>Bank:</font> {acct_details.bank_name}",
                        box_text_style,
                    )
                )
                payment_info.append(
                    Paragraph(
                        f"<font color='#64748b'>Account Name:</font> {acct_details.account_name}",
                        box_text_style,
                    )
                )
                payment_info.append(
                    Paragraph(
                        f"<font color='#64748b'>Account Number:</font> {acct_details.account_number}",
                        box_text_style,
                    )
                )
            else:
                payment_info.append(
                    Paragraph("No payment details provided.", box_text_style)
                )

        payment_table = Table([[payment_info]], colWidths=[4 * inch])
        payment_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f8fafc")),
                    ("PADDING", (0, 0), (0, 0), 12),
                    ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                    ("BORDER", (0, 0), (0, 0), 0.5, colors.HexColor("#e2e8f0")),
                ]
            )
        )

    totals_rows = [
        [
            Paragraph("Subtotal", meta_label_style),
            Paragraph(
                f"{currency_symbol}{invoice.subtotal:,.2f}",
                ParagraphStyle("R", alignment=TA_RIGHT, fontSize=10),
            ),
        ]
    ]
    if invoice.discount_percentage and invoice.discount_percentage > 0:
        discount_value = invoice.subtotal * (
            invoice.discount_percentage / Decimal("100")
        )
        totals_rows.append(
            [
                Paragraph(
                    f"Discount ({invoice.discount_percentage:g}%)", meta_label_style
                ),
                Paragraph(
                    f"-{currency_symbol}{discount_value:,.2f}",
                    ParagraphStyle("R", alignment=TA_RIGHT, fontSize=10),
                ),
            ]
        )
    elif invoice.discount_amount and invoice.discount_amount > 0:
        totals_rows.append(
            [
                Paragraph("Discount", meta_label_style),
                Paragraph(
                    f"-{currency_symbol}{invoice.discount_amount:,.2f}",
                    ParagraphStyle("R", alignment=TA_RIGHT, fontSize=10),
                ),
            ]
        )

    if invoice.tax_percentage and invoice.tax_percentage > 0:
        totals_rows.append(
            [
                Paragraph(f"Tax ({invoice.tax_percentage:g}%)", meta_label_style),
                Paragraph(
                    f"{currency_symbol}{invoice.tax_amount:,.2f}",
                    ParagraphStyle("R", alignment=TA_RIGHT, fontSize=10),
                ),
            ]
        )

    totals_rows.append(
        [
            Paragraph("Total (<b>" + (currency_symbol or "") + "</b>)", meta_val_style),
            Paragraph(
                f"<b>{currency_symbol}{invoice.total_amount:,.2f}</b>",
                ParagraphStyle("R", alignment=TA_RIGHT, fontSize=12),
            ),
        ]
    )

    totals_table = Table(totals_rows, colWidths=[1.5 * inch, 1.5 * inch])
    totals_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, -1), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    if payment_table is not None:
        bottom_table = Table(
            [[payment_table, totals_table]], colWidths=[4.2 * inch, 3.0 * inch]
        )
        bottom_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ]
            )
        )
    else:
        bottom_table = Table([["", totals_table]], colWidths=[4.2 * inch, 3.0 * inch])
        bottom_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ]
            )
        )
    elements.append(bottom_table)

    # ---- Notes ----
    if invoice.notes:
        elements.append(Spacer(1, 0.4 * inch))
        elements.append(Paragraph("<b>Notes:</b>", box_title_style))
        elements.append(Paragraph(invoice.notes.replace("\n", "<br/>"), box_text_style))

    # Powered by NeoOps footer
    small_style = ParagraphStyle(
        "SmallStyle",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#94a3b8"),
        alignment=TA_CENTER,
    )
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph("Powered by NeoOps", small_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_quotation_pdf(quotation):
    """
    Generates a branded PDF for a quotation. Structurally mirrors
    generate_invoice_pdf, swapping in quotation-specific labels/fields
    (quotation number, "Valid Until" instead of "Due Date").
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
    organization = quotation.organization
    currency_symbol = _currency_label(quotation.currency or organization.currency)

    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Heading1"],
        fontSize=28,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=15,
        fontName="Helvetica-Bold",
    )
    meta_label_style = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
    )
    meta_val_style = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
    )

    box_header_style = ParagraphStyle(
        "BoxHeader",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#64748b"),
        fontName="Helvetica-Bold",
        spaceAfter=6,
        textTransform="uppercase",
    )
    box_text_style = ParagraphStyle(
        "BoxText",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#334155"),
        leading=14,
    )
    box_title_style = ParagraphStyle(
        "BoxTitle",
        parent=styles["Normal"],
        fontSize=12,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
        spaceAfter=4,
    )

    elements = []

    # ---- Top Header ----
    left_meta = []
    left_meta.append(
        [
            Paragraph("Quotation No #", meta_label_style),
            Paragraph(quotation.quotation_number, meta_val_style),
        ]
    )
    left_meta.append(
        [
            Paragraph("Issue Date", meta_label_style),
            Paragraph(quotation.issue_date.strftime("%b %d, %Y"), meta_val_style),
        ]
    )
    if quotation.expiry_date:
        left_meta.append(
            [
                Paragraph("Valid Until", meta_label_style),
                Paragraph(quotation.expiry_date.strftime("%b %d, %Y"), meta_val_style),
            ]
        )
    status_color = "#16a34a" if quotation.status in ("converted", "paid") else "#2563eb"
    left_meta.append(
        [
            Paragraph("Status", meta_label_style),
            Paragraph(
                f"<font color='{status_color}'>{quotation.get_status_display()}</font>",
                meta_val_style,
            ),
        ]
    )

    meta_table = Table(left_meta, colWidths=[1.2 * inch, 2.5 * inch])
    meta_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    header_left = [Paragraph(quotation.title or "Quotation", title_style), meta_table]

    # Build the right-side header cell — wrap logo in a nested table
    # so ReportLab right-aligns it correctly and the Image is eagerly resolved.
    logo = _load_logo_flowable(organization, size=1.4 * inch)
    if logo:
        logo_table = Table([[logo]], colWidths=[2.2 * inch])
        logo_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (0, 0), "RIGHT"),
                    ("VALIGN", (0, 0), (0, 0), "TOP"),
                ]
            )
        )
        header_right = logo_table
    else:
        header_right = Spacer(1, 1)

    top_table = Table([[header_left, header_right]], colWidths=[5 * inch, 2.2 * inch])
    top_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    elements.append(top_table)
    elements.append(Spacer(1, 0.4 * inch))

    # ---- Billed By / Billed To Boxes ----
    billed_by = [Paragraph("BILLED BY", box_header_style)]
    billed_by.append(Paragraph(html.escape(organization.name), box_title_style))
    if organization.address:
        billed_by.append(
            Paragraph(
                html.escape(organization.address).replace("\n", "<br/>"),
                box_text_style,
            )
        )
    if organization.phone_number:
        billed_by.append(
            Paragraph(html.escape(organization.phone_number), box_text_style)
        )
    if organization.email:
        billed_by.append(Paragraph(html.escape(organization.email), box_text_style))

    billed_to = _build_billed_to_box(
        quotation, box_header_style, box_title_style, box_text_style, "BILLED TO"
    )

    box_bg = colors.HexColor("#f1f5f9")
    by_table = Table([[billed_by]], colWidths=[3.5 * inch])
    by_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), box_bg),
                ("PADDING", (0, 0), (0, 0), 12),
                ("ROUNDEDCORNERS", [8, 8, 8, 8]),
            ]
        )
    )

    to_table = Table([[billed_to]], colWidths=[3.5 * inch])
    to_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), box_bg),
                ("PADDING", (0, 0), (0, 0), 12),
                ("ROUNDEDCORNERS", [8, 8, 8, 8]),
            ]
        )
    )

    info_table = Table(
        [[by_table, "", to_table]], colWidths=[3.5 * inch, 0.2 * inch, 3.5 * inch]
    )
    info_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.4 * inch))

    # ---- Line Items ----
    data = [["Item", "Qty", "Rate", "Total"]]
    for idx, item in enumerate(quotation.line_items.all()):
        item_text = f"<b>{idx + 1}. {item.name}</b>"
        if item.description:
            item_text += (
                f"<br/><font color='#64748b' size='9'>{item.description}</font>"
            )

        data.append(
            [
                Paragraph(item_text, styles["Normal"]),
                f"{float(item.quantity):g}",
                f"{currency_symbol}{item.unit_price:,.2f}",
                f"{currency_symbol}{item.total:,.2f}",
            ]
        )

    table = Table(data, colWidths=[3.8 * inch, 0.8 * inch, 1.3 * inch, 1.3 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                ("TOPPADDING", (0, 0), (-1, 0), 10),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("LINEBELOW", (0, 1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 1), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 1), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 12),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 0.3 * inch))

    # ---- Payment Info & Totals ----
    show_bank_details = getattr(quotation, "show_bank_details", True)
    payment_table = None
    if show_bank_details:
        bank_account = quotation.bank_account
        payment_info = [Paragraph("Payment Info", box_title_style)]
        if bank_account:
            payment_info.append(
                Paragraph(
                    f"<font color='#64748b'>Bank:</font> {bank_account.bank_name}",
                    box_text_style,
                )
            )
            payment_info.append(
                Paragraph(
                    f"<font color='#64748b'>Account Name:</font> {bank_account.account_name}",
                    box_text_style,
                )
            )
            payment_info.append(
                Paragraph(
                    f"<font color='#64748b'>Account Number:</font> {bank_account.account_number}",
                    box_text_style,
                )
            )
            if bank_account.account_type:
                payment_info.append(
                    Paragraph(
                        f"<font color='#64748b'>Account Type:</font> {bank_account.get_account_type_display()}",
                        box_text_style,
                    )
                )
            if bank_account.swift_code:
                payment_info.append(
                    Paragraph(
                        f"<font color='#64748b'>SWIFT:</font> {bank_account.swift_code}",
                        box_text_style,
                    )
                )
        else:
            acct_details = getattr(organization, "account_details", None)
            if acct_details and acct_details.bank_name:
                payment_info.append(
                    Paragraph(
                        f"<font color='#64748b'>Bank:</font> {acct_details.bank_name}",
                        box_text_style,
                    )
                )
                payment_info.append(
                    Paragraph(
                        f"<font color='#64748b'>Account Name:</font> {acct_details.account_name}",
                        box_text_style,
                    )
                )
                payment_info.append(
                    Paragraph(
                        f"<font color='#64748b'>Account Number:</font> {acct_details.account_number}",
                        box_text_style,
                    )
                )
            else:
                payment_info.append(
                    Paragraph("No payment details provided.", box_text_style)
                )

        payment_table = Table([[payment_info]], colWidths=[4 * inch])
        payment_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f8fafc")),
                    ("PADDING", (0, 0), (0, 0), 12),
                    ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                    ("BORDER", (0, 0), (0, 0), 0.5, colors.HexColor("#e2e8f0")),
                ]
            )
        )

    totals_rows = [
        [
            Paragraph("Subtotal", meta_label_style),
            Paragraph(
                f"{currency_symbol}{quotation.subtotal:,.2f}",
                ParagraphStyle("R", alignment=TA_RIGHT, fontSize=10),
            ),
        ]
    ]
    if quotation.discount_percentage and quotation.discount_percentage > 0:
        discount_value = quotation.subtotal * (
            quotation.discount_percentage / Decimal("100")
        )
        totals_rows.append(
            [
                Paragraph(
                    f"Discount ({quotation.discount_percentage:g}%)", meta_label_style
                ),
                Paragraph(
                    f"-{currency_symbol}{discount_value:,.2f}",
                    ParagraphStyle("R", alignment=TA_RIGHT, fontSize=10),
                ),
            ]
        )
    elif quotation.discount_amount and quotation.discount_amount > 0:
        totals_rows.append(
            [
                Paragraph("Discount", meta_label_style),
                Paragraph(
                    f"-{currency_symbol}{quotation.discount_amount:,.2f}",
                    ParagraphStyle("R", alignment=TA_RIGHT, fontSize=10),
                ),
            ]
        )

    if quotation.tax_percentage and quotation.tax_percentage > 0:
        totals_rows.append(
            [
                Paragraph(f"Tax ({quotation.tax_percentage:g}%)", meta_label_style),
                Paragraph(
                    f"{currency_symbol}{quotation.tax_amount:,.2f}",
                    ParagraphStyle("R", alignment=TA_RIGHT, fontSize=10),
                ),
            ]
        )

    totals_rows.append(
        [
            Paragraph("Total (<b>" + (currency_symbol or "") + "</b>)", meta_val_style),
            Paragraph(
                f"<b>{currency_symbol}{quotation.total_amount:,.2f}</b>",
                ParagraphStyle("R", alignment=TA_RIGHT, fontSize=12),
            ),
        ]
    )

    totals_table = Table(totals_rows, colWidths=[1.5 * inch, 1.5 * inch])
    totals_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, -1), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    if payment_table is not None:
        bottom_table = Table(
            [[payment_table, totals_table]], colWidths=[4.2 * inch, 3.0 * inch]
        )
    else:
        bottom_table = Table([["", totals_table]], colWidths=[4.2 * inch, 3.0 * inch])
    bottom_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    elements.append(bottom_table)

    # ---- Notes ----
    if quotation.notes:
        elements.append(Spacer(1, 0.4 * inch))
        elements.append(Paragraph("<b>Notes:</b>", box_title_style))
        elements.append(
            Paragraph(quotation.notes.replace("\n", "<br/>"), box_text_style)
        )

    small_style = ParagraphStyle(
        "SmallStyle",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#94a3b8"),
        alignment=TA_CENTER,
    )
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph("Powered by NeoOps", small_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def receipt_breakdown(receipt):
    """Payment position *as of this receipt*: what's owed, what was paid
    before, this payment, paid to date, and the balance — for invoice-only
    payments as well as booking payments. Payments are matched on the
    invoice when there is one, else on the booking."""
    from .models import Payment, Invoice

    payment = receipt.payment
    booking = payment.booking
    invoice = payment.invoice_record or (
        Invoice.objects.filter(booking=booking).first() if booking else None
    )

    if invoice is not None:
        total = Decimal(str(invoice.total_amount or 0))
        related = Payment.objects.filter(status="completed").filter(
            models_Q(invoice_record=invoice)
            | (models_Q(booking=booking) if booking else models_Q(pk__in=[]))
        )
    elif booking is not None:
        total = Decimal(str(booking.total_amount or 0))
        related = Payment.objects.filter(status="completed", booking=booking)
    else:
        total = Decimal(str(receipt.amount or 0))
        related = Payment.objects.filter(pk=payment.pk)

    history = list(related.distinct().order_by("payment_date", "payment_id"))
    # Everything up to and including this payment.
    upto = []
    for p in history:
        upto.append(p)
        if p.pk == payment.pk:
            break
    else:
        upto.append(payment)
    this_amount = Decimal(str(receipt.amount or 0))
    paid_to_date = sum((Decimal(str(p.amount)) for p in upto), Decimal("0"))
    previously_paid = paid_to_date - this_amount
    balance = max(total - paid_to_date, Decimal("0"))

    client = (invoice.client if invoice is not None and invoice.client else None) or (
        booking.client if booking is not None else None
    )
    client_name = None
    if client is not None:
        client_name = (
            client.business_name
            or " ".join(p for p in [client.first_name, client.last_name] if p)
            or client.email
        )
    if not client_name and booking is not None:
        client_name = booking.contact_name

    return {
        "invoice_number": invoice.invoice_number if invoice is not None else None,
        "booking_id": booking.booking_id if booking is not None else None,
        "booking_title": booking.booking_title if booking is not None else None,
        "client_name": client_name or "—",
        "total": total,
        "previously_paid": max(previously_paid, Decimal("0")),
        "this_payment": this_amount,
        "paid_to_date": paid_to_date,
        "balance": balance,
        "is_full": balance <= 0,
        "payment_date": payment.payment_date,
        "reference": payment.invoice_id or "",
        "history": [
            {
                "date": p.payment_date,
                "amount": Decimal(str(p.amount)),
                "is_this": p.pk == payment.pk,
            }
            for p in upto
        ],
    }


def _brand_colors(organization):
    """The organization's brand colour, a pale tint of it, and the text
    colour that reads on it. Falls back to slate for missing/bad values."""
    raw = (getattr(organization, "primary_color", "") or "").strip()
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", raw):
        raw = "#0f172a"
    r, g, b = (int(raw[i : i + 2], 16) for i in (1, 3, 5))
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    tint = "#%02x%02x%02x" % tuple(int(c + (255 - c) * 0.9) for c in (r, g, b))
    on_brand = "#0f172a" if luminance > 0.7 else "#ffffff"
    return colors.HexColor(raw), colors.HexColor(tint), colors.HexColor(on_brand)


def generate_receipt_pdf(receipt):
    """
    Generates a branded PDF for a receipt, laid out like the invoice PDF
    and accented with the organization's brand colour. Shows this payment
    against the invoice total, everything paid before it, and the balance.
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
    organization = receipt.organization
    currency_symbol = _currency_label(organization.currency)
    brand, brand_tint, on_brand = _brand_colors(organization)
    b = receipt_breakdown(receipt)
    money = lambda v: f"{currency_symbol}{v:,.2f}"  # noqa: E731
    full_width = 7.2 * inch

    # Styles (shared with the invoice PDF)
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Heading1"],
        fontSize=28,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=15,
        fontName="Helvetica-Bold",
    )
    meta_label_style = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
    )
    meta_val_style = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
    )
    box_header_style = ParagraphStyle(
        "BoxHeader",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#64748b"),
        fontName="Helvetica-Bold",
        spaceAfter=6,
    )
    box_text_style = ParagraphStyle(
        "BoxText",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#334155"),
        leading=14,
    )
    box_title_style = ParagraphStyle(
        "BoxTitle",
        parent=styles["Normal"],
        fontSize=12,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
        spaceAfter=4,
    )
    section_style = ParagraphStyle(
        "Section",
        parent=box_title_style,
        spaceAfter=8,
    )
    row_label_style = ParagraphStyle(
        "RowLabel", parent=box_text_style, textColor=colors.HexColor("#64748b")
    )
    row_val_style = ParagraphStyle(
        "RowVal",
        parent=box_text_style,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
        alignment=TA_RIGHT,
    )

    elements = []

    # ---- Brand bar ----
    bar = Table([[""]], colWidths=[full_width], rowHeights=[5])
    bar.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), brand),
                ("ROUNDEDCORNERS", [3, 3, 3, 3]),
            ]
        )
    )
    elements.append(bar)
    elements.append(Spacer(1, 0.3 * inch))

    # ---- Top Header ----
    status_label = "Paid in full" if b["is_full"] else "Partial payment"
    status_color = "#16a34a" if b["is_full"] else "#d97706"
    left_meta = [
        [
            Paragraph("Receipt No #", meta_label_style),
            Paragraph(receipt.receipt_number, meta_val_style),
        ],
        [
            Paragraph("Receipt Date", meta_label_style),
            Paragraph(receipt.issue_date.strftime("%b %d, %Y"), meta_val_style),
        ],
    ]
    if b["invoice_number"]:
        left_meta.append(
            [
                Paragraph("Invoice No #", meta_label_style),
                Paragraph(b["invoice_number"], meta_val_style),
            ]
        )
    if b["booking_id"]:
        left_meta.append(
            [
                Paragraph("Booking ID", meta_label_style),
                Paragraph(f"#{b['booking_id']}", meta_val_style),
            ]
        )
    left_meta.append(
        [
            Paragraph("Status", meta_label_style),
            Paragraph(
                f"<font color='{status_color}'>{status_label}</font>", meta_val_style
            ),
        ]
    )
    meta_table = Table(left_meta, colWidths=[1.2 * inch, 2.5 * inch])
    meta_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    header_left = [Paragraph("Payment Receipt", title_style), meta_table]

    logo = _load_logo_flowable(organization, size=1.4 * inch)
    if logo:
        logo_table = Table([[logo]], colWidths=[2.2 * inch])
        logo_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (0, 0), "RIGHT"),
                    ("VALIGN", (0, 0), (0, 0), "TOP"),
                ]
            )
        )
        header_right = logo_table
    else:
        header_right = Spacer(1, 1)

    top_table = Table([[header_left, header_right]], colWidths=[5 * inch, 2.2 * inch])
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

    # ---- Amount received banner ----
    amount_label_style = ParagraphStyle(
        "AmountLabel",
        parent=styles["Normal"],
        fontSize=9,
        textColor=on_brand,
        fontName="Helvetica-Bold",
    )
    amount_val_style = ParagraphStyle(
        "AmountVal",
        parent=styles["Normal"],
        fontSize=24,
        leading=28,
        textColor=on_brand,
        fontName="Helvetica-Bold",
    )
    amount_side_style = ParagraphStyle(
        "AmountSide",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=on_brand,
        alignment=TA_RIGHT,
    )
    banner = Table(
        [
            [
                [
                    Paragraph("AMOUNT RECEIVED", amount_label_style),
                    Spacer(1, 4),
                    Paragraph(money(b["this_payment"]), amount_val_style),
                ],
                Paragraph(
                    f"{b['payment_date'].strftime('%d %b %Y, %H:%M')}<br/>"
                    f"<b>Balance: {money(b['balance'])}</b>",
                    amount_side_style,
                ),
            ]
        ],
        colWidths=[4.2 * inch, 3 * inch],
    )
    banner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), brand),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 16),
                ("RIGHTPADDING", (0, 0), (-1, -1), 16),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
                ("ROUNDEDCORNERS", [8, 8, 8, 8]),
            ]
        )
    )
    elements.append(banner)
    elements.append(Spacer(1, 0.3 * inch))

    # ---- Received By / Received From Boxes ----
    received_by = [Paragraph("RECEIVED BY", box_header_style)]
    received_by.append(Paragraph(organization.name, box_title_style))
    if organization.address:
        received_by.append(
            Paragraph(organization.address.replace("\n", "<br/>"), box_text_style)
        )
    if organization.phone_number:
        received_by.append(Paragraph(organization.phone_number, box_text_style))
    if organization.email:
        received_by.append(Paragraph(organization.email, box_text_style))

    received_from = [Paragraph("RECEIVED FROM", box_header_style)]
    received_from.append(Paragraph(b["client_name"], box_title_style))
    if b["booking_title"]:
        received_from.append(Paragraph(f"For: {b['booking_title']}", box_text_style))

    box_bg = colors.HexColor("#f1f5f9")
    boxes = []
    for content in (received_by, received_from):
        t = Table([[content]], colWidths=[3.5 * inch])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, 0), box_bg),
                    ("PADDING", (0, 0), (0, 0), 12),
                    ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                ]
            )
        )
        boxes.append(t)
    info_table = Table(
        [[boxes[0], "", boxes[1]]], colWidths=[3.5 * inch, 0.2 * inch, 3.5 * inch]
    )
    info_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.35 * inch))

    # ---- Payment breakdown ----
    elements.append(Paragraph("Payment breakdown", section_style))
    rows = [
        ("Invoice total", money(b["total"])),
        ("Previously paid", money(b["previously_paid"])),
        ("This payment", money(b["this_payment"])),
        ("Total paid to date", money(b["paid_to_date"])),
        ("Balance remaining", money(b["balance"])),
    ]
    if b["reference"] and not b["reference"].startswith("AUTO-"):
        rows.append(("Reference", b["reference"]))
    data = [
        [Paragraph(k, row_label_style), Paragraph(v, row_val_style)] for k, v in rows
    ]
    this_row, balance_row = 2, 4
    breakdown = Table(data, colWidths=[4.6 * inch, 2.6 * inch])
    breakdown.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#e2e8f0")),
                ("BACKGROUND", (0, this_row), (-1, this_row), brand_tint),
                ("LINEABOVE", (0, balance_row), (-1, balance_row), 1, brand),
            ]
        )
    )
    elements.append(breakdown)

    # ---- Payment history (all payments up to this one) ----
    if len(b["history"]) > 1:
        elements.append(Spacer(1, 0.35 * inch))
        elements.append(Paragraph("Payment history", section_style))
        hist = [["#", "Date", "Amount"]]
        this_idx = None
        for idx, h in enumerate(b["history"], start=1):
            if h["is_this"]:
                this_idx = idx
            hist.append(
                [
                    f"{idx}{'  (this receipt)' if h['is_this'] else ''}",
                    h["date"].strftime("%d %b %Y"),
                    money(h["amount"]),
                ]
            )
        htable = Table(hist, colWidths=[3 * inch, 2.2 * inch, 2 * inch])
        hstyle = [
            ("BACKGROUND", (0, 0), (-1, 0), brand),
            ("TEXTCOLOR", (0, 0), (-1, 0), on_brand),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#334155")),
            ("ALIGN", (2, 0), (2, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("LINEBELOW", (0, 1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ]
        if this_idx:
            hstyle += [
                ("BACKGROUND", (0, this_idx), (-1, this_idx), brand_tint),
                ("FONTNAME", (0, this_idx), (-1, this_idx), "Helvetica-Bold"),
            ]
        htable.setStyle(TableStyle(hstyle))
        elements.append(htable)

    # ---- Notes ----
    if receipt.notes:
        elements.append(Spacer(1, 0.35 * inch))
        elements.append(Paragraph("<b>Notes:</b>", box_title_style))
        elements.append(Paragraph(receipt.notes, box_text_style))

    # ---- Footer ----
    elements.append(Spacer(1, 0.5 * inch))
    elements.append(
        Paragraph(
            f"Thank you for your business, from all of us at {organization.name}.",
            ParagraphStyle(
                "Thanks",
                parent=box_text_style,
                alignment=TA_CENTER,
                # A very light brand colour would vanish on white paper.
                textColor=(
                    brand
                    if on_brand.hexval() == "0xffffff"
                    else colors.HexColor("#334155")
                ),
                fontName="Helvetica-Bold",
            ),
        )
    )
    elements.append(Spacer(1, 0.15 * inch))
    elements.append(
        Paragraph(
            "Powered by NeoOps",
            ParagraphStyle(
                "Small",
                parent=styles["Normal"],
                fontSize=8,
                textColor=colors.HexColor("#94a3b8"),
                alignment=TA_CENTER,
            ),
        )
    )

    doc.build(elements)
    buffer.seek(0)
    return buffer


try:
    import pytesseract
    from PIL import Image, ImageFilter, ImageOps
    from pdf2image import convert_from_bytes
except ImportError:
    pass


# ─────────────────────────────────────────────────────────────────────────────
# TEXT EXTRACTION
# Strategy:
#   1. Native PDF (pdfplumber) → best quality, no OCR needed
#   2. Scanned PDF            → pdf2image + enhanced pytesseract OCR
#   3. Image file             → enhanced pytesseract OCR
# ─────────────────────────────────────────────────────────────────────────────


def _preprocess_image_for_ocr(img: "Image.Image") -> "Image.Image":
    """
    Apply standard preprocessing to improve pytesseract accuracy:
    - Convert to grayscale
    - Resize to 300 DPI equivalent if small
    - Sharpen + enhance contrast
    - Binarise with Otsu threshold via point()
    """
    img = img.convert("L")  # grayscale

    # Upscale small images so Tesseract has enough resolution
    w, h = img.size
    if w < 1000:
        scale = max(1000 / w, 1)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    img = img.filter(ImageFilter.SHARPEN)
    img = ImageOps.autocontrast(img, cutoff=2)

    # Simple binary threshold at mid-point (mimics Otsu for most invoices)
    img = img.point(lambda p: 255 if p > 128 else 0, "1").convert("L")
    return img


def _ocr_image(img: "Image.Image") -> str:
    """Run Tesseract on a PIL image with invoice-optimised config."""
    processed = _preprocess_image_for_ocr(img)
    # PSM 6 = uniform block of text; best for invoices laid out as pages
    custom_cfg = "--oem 3 --psm 6"
    return pytesseract.image_to_string(processed, config=custom_cfg)


def _extract_text_pdfplumber(file_bytes: bytes) -> str:
    """
    Extract text from a native (text-based) PDF using pdfplumber.
    Returns the full text if the PDF contains selectable text, else empty string.
    """
    try:
        import pdfplumber
        import io

        text_parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
                text_parts.append(page_text)

                # Also extract tables and flatten them into text rows
                for table in page.extract_tables():
                    for row in table:
                        row_cells = [str(cell or "").strip() for cell in row]
                        non_empty = [c for c in row_cells if c]
                        if non_empty:
                            text_parts.append("\t".join(non_empty))

        return "\n".join(text_parts).strip()
    except Exception:
        return ""


def _extract_text_from_file(file_bytes: bytes, file_type: str) -> str:
    """
    Master text extraction:
    - PDFs: try pdfplumber first; if too short fall back to OCR
    - Images: run enhanced pytesseract directly
    """
    import io

    if file_type == "application/pdf":
        # Attempt 1: native text extraction (fast, accurate)
        native_text = _extract_text_pdfplumber(file_bytes)
        if len(native_text) >= 50:  # meaningful content found
            return native_text

        # Attempt 2: scanned PDF → rasterise then OCR
        try:
            images = convert_from_bytes(file_bytes, dpi=300)
            pages = [_ocr_image(img) for img in images]
            return "\n".join(pages).strip()
        except Exception as e:
            logger.exception("PDF OCR failed")
            raise RuntimeError(
                "Could not extract text from the PDF document. Please ensure it is a clear, legible document."
            )

    else:
        # Image file
        try:
            img = Image.open(io.BytesIO(file_bytes))
            return _ocr_image(img).strip()
        except Exception as e:
            logger.exception("Image OCR failed")
            raise RuntimeError(
                "Could not extract text from the image. Please ensure it is a clear, legible image."
            )


# ─────────────────────────────────────────────────────────────────────────────
# STRUCTURED REGEX PARSER
# ─────────────────────────────────────────────────────────────────────────────

# Currency symbols we recognise
_CCY = r"(?:[\$€£₦₹¥₩]|\b(?:USD|EUR|GBP|NGN|INR|CAD|AUD)\b)?"

# Date patterns: 2024-01-31 | 01/31/2024 | 31 Jan 2024 | January 31, 2024
_DATE_PAT = (
    r"(\d{4}[-/]\d{1,2}[-/]\d{1,2}"  # ISO: 2024-01-31
    r"|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}"  # US/EU: 01/31/24
    r"|\d{1,2}\s+\w{3,9}\s+\d{4}"  # 31 January 2024
    r"|\w{3,9}\s+\d{1,2},?\s+\d{4})"  # January 31, 2024
)


def _parse_date(raw: str) -> "str | None":
    from dateutil import parser as dp

    try:
        return dp.parse(raw.strip(), dayfirst=True).strftime("%Y-%m-%d")
    except Exception:
        return None


def _parse_amount(raw: str) -> "float | None":
    cleaned = re.sub(r"[^\d.]", "", raw.replace(",", ""))
    try:
        return float(cleaned) if cleaned else None
    except Exception:
        return None


def _extract_field_date(text: str, *label_patterns: str) -> "str | None":
    """Find first date after any of the label_patterns."""
    for label in label_patterns:
        pattern = rf"(?i){label}[\s:]*{_DATE_PAT}"
        m = re.search(pattern, text)
        if m:
            result = _parse_date(m.group(1))
            if result:
                return result
    return None


def _extract_field_amount(text: str, *label_patterns: str) -> "float | None":
    """Find first amount after any of the label_patterns."""
    for label in label_patterns:
        pattern = rf"(?i){label}[\s:]*{_CCY}\s*([\d,]+\.?\d*)"
        m = re.search(pattern, text)
        if m:
            return _parse_amount(m.group(1))
    return None


def _extract_title(text: str) -> "str | None":
    """
    Look for a prominent invoice type keyword near the top of the document.
    """
    for kw in [
        "TAX INVOICE",
        "INVOICE",
        "PROFORMA INVOICE",
        "SALES INVOICE",
        "CREDIT NOTE",
        "DEBIT NOTE",
        "RECEIPT",
        "QUOTATION",
        "ESTIMATE",
    ]:
        if re.search(rf"(?i)\b{re.escape(kw)}\b", text[:600]):
            return kw.title()
    return "Invoice"


def _extract_client_name(text: str) -> "str | None":
    """
    Try several common 'Bill To' / 'Client' block formats.
    Takes the first non-blank line after the label.
    """
    patterns = [
        r"(?i)(?:bill(?:ed)?\s+to|invoice\s+to|client|customer|sold\s+to|to)\s*:?\s*\n+([^\n]{3,80})",
        r"(?i)(?:bill(?:ed)?\s+to|invoice\s+to|client|customer)\s*:?\s+([A-Za-z][^\n]{2,79})",
        r"(?i)to\s*:\s*([A-Za-z][^\n]{2,79})",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            name = m.group(1).strip()
            # Skip lines that look like headings or labels
            if not re.match(r"(?i)^(address|email|phone|date|invoice|amount)", name):
                return name[:100]
    return None


def _extract_line_items(text: str) -> list:
    """
    Detect tabular line items from the extracted text.

    Strategy:
    1. Look for a table header row containing keywords like
       "description", "item", "qty", "quantity", "price", "amount"
    2. Parse lines between that header and a footer row (subtotal/total)
    3. Each line must have ≥2 numeric-looking tokens at the right side

    Returns a list of dicts with keys: name, description, quantity, unit_price
    """
    items = []

    # ── Attempt 1: find structured table section ──────────────────────────
    # Locate header line
    header_match = re.search(
        r"(?i)^.*(description|item|service|particulars).*(qty|quantity|units?).*(price|rate|unit\s*price|amount).*$",
        text,
        re.MULTILINE,
    )

    if header_match:
        header_end = header_match.end()
        # Extract everything up to the first subtotal/total line
        after_header = text[header_end:]
        footer_match = re.search(
            r"(?i)^\s*(?:sub\s*total|subtotal|total amount|total due|amount due|grand total)",
            after_header,
            re.MULTILINE,
        )
        table_block = (
            after_header[: footer_match.start()]
            if footer_match
            else after_header[:3000]
        )

        for line in table_block.splitlines():
            line = line.strip()
            if not line or len(line) < 5:
                continue
            # Must contain at least two numbers (qty + price or price + total)
            numbers = re.findall(r"[\d,]+\.?\d*", line)
            if len(numbers) < 2:
                continue

            # Take the last two numbers as unit_price and total (or qty and price)
            nums = [_parse_amount(n) for n in numbers[-3:]]
            nums = [n for n in nums if n is not None and n > 0]
            if len(nums) < 2:
                continue

            # Heuristic: if 3 nums, treat as qty / unit_price / total
            if len(nums) >= 3:
                qty = nums[0]
                unit_price = nums[1]
            else:
                qty = 1
                unit_price = nums[0]

            # The item name is the text before the first number
            first_num_pos = re.search(r"[\d,]+\.?\d*", line)
            name = line[: first_num_pos.start()].strip() if first_num_pos else line
            name = re.sub(r"[\t|]+", " ", name).strip()

            if name and len(name) >= 2:
                items.append(
                    {
                        "name": name[:200],
                        "description": "",
                        "quantity": qty,
                        "unit_price": unit_price,
                    }
                )

    # ── Attempt 2: loose line-item detection (qty × price pattern) ────────
    if not items:
        # Pattern: "Some Service Name  2  150.00  300.00"
        loose_pat = re.compile(
            r"^(.{3,60?}?)\s+(\d+(?:\.\d+)?)\s+"
            + _CCY
            + r"\s*([\d,]+\.\d{2})\s+"
            + _CCY
            + r"\s*([\d,]+\.\d{2})\s*$",
            re.MULTILINE,
        )
        for m in loose_pat.finditer(text):
            name = m.group(1).strip()
            qty = float(m.group(2))
            unit_price = _parse_amount(m.group(3))
            if name and unit_price:
                items.append(
                    {
                        "name": name[:200],
                        "description": "",
                        "quantity": qty,
                        "unit_price": unit_price,
                    }
                )

    return items[:50]  # sanity cap


def _extract_tax_percentage(text: str) -> "float | None":
    """Try to extract a tax/VAT/GST percentage."""
    patterns = [
        r"(?i)(?:vat|gst|tax|hst|pst)\s*(?:@|at|rate)?\s*(\d{1,2}(?:\.\d{1,2})?)%",
        r"(?i)(?:vat|gst|tax)\s*[\(:@]\s*(\d{1,2}(?:\.\d{1,2})?)%?\s*[):]?",
        r"(?i)(\d{1,2}(?:\.\d{1,2})?)%\s*(?:vat|gst|tax)",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            try:
                val = float(m.group(1))
                if 0 < val <= 100:
                    return val
            except Exception:
                pass
    return None


def _extract_invoice_number(text: str) -> "str | None":
    """Extract the invoice reference number."""
    patterns = [
        r"(?i)invoice\s*#?\s*:?\s*([A-Z0-9][-A-Z0-9/]{2,30})",
        r"(?i)inv(?:oice)?\s*(?:no|num|number|#)\s*[:\-]?\s*([A-Z0-9][-A-Z0-9/]{2,30})",
        r"(?i)ref(?:erence)?\s*(?:no|#)?\s*[:\-]\s*([A-Z0-9][-A-Z0-9/]{2,30})",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            return m.group(1).strip()
    return None


def _structured_parse(text: str) -> dict:
    """
    Full structured parser — extracts all invoice fields from plain text
    without any GenAI dependency.
    """
    data = {
        "client_name": _extract_client_name(text),
        "title": _extract_title(text),
        "invoice_number_hint": _extract_invoice_number(text),  # informational only
        "issue_date": _extract_field_date(
            text,
            r"invoice\s+date",
            r"date\s+issued",
            r"issue\s+date",
            r"date\s+of\s+invoice",
            r"(?<!\w)date",
        ),
        "due_date": _extract_field_date(
            text, r"due\s+date", r"payment\s+due", r"pay\s+by", r"payable\s+by"
        ),
        "subtotal": _extract_field_amount(
            text, r"sub\s*total", r"net\s+amount", r"before\s+tax"
        ),
        "tax_percentage": _extract_tax_percentage(text),
        "discount_amount": _extract_field_amount(
            text, r"discount", r"rebate", r"deduction"
        ),
        "total_amount": _extract_field_amount(
            text,
            r"total\s+amount\s+due",
            r"amount\s+due",
            r"grand\s+total",
            r"total\s+due",
            r"balance\s+due",
            r"(?<!\w)total",
        ),
        "notes": None,
        "line_items": _extract_line_items(text),
        "parse_method": "ocr",
    }

    # Extract payment terms / notes block
    notes_match = re.search(
        r"(?i)(?:notes?|terms?|payment\s+terms?|remarks?)\s*:?\s*\n?(.{10,500}?)(?:\n\n|\Z)",
        text,
        re.DOTALL,
    )
    if notes_match:
        data["notes"] = notes_match.group(1).strip()[:500]

    return data


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────


def extract_invoice_data(file_bytes: bytes, file_type: str) -> dict:
    """
    Extract structured invoice data from a PDF or image file.

    Pipeline:
      1. pdfplumber  → native text extraction for digital PDFs (highest accuracy)
      2. pytesseract → OCR with image preprocessing for scanned docs / images
      3. Structured regex parser → derives all invoice fields from the text

    Returns a dict with keys:
      client_name, title, issue_date, due_date, subtotal, tax_percentage,
      discount_amount, total_amount, notes, line_items, raw_text, parse_method
    """
    # Step 1: extract raw text
    try:
        raw_text = _extract_text_from_file(file_bytes, file_type)
    except RuntimeError as e:
        return {
            "error": str(e),
            "raw_text": "",
            "parse_method": "failed",
            "line_items": [],
        }

    if not raw_text or len(raw_text) < 10:
        return {
            "error": (
                "Could not extract any text from the file. "
                "Please ensure the image is clear and not rotated."
            ),
            "raw_text": "",
            "parse_method": "failed",
            "line_items": [],
        }

    # Step 2: structured parse
    result = _structured_parse(raw_text)
    result["raw_text"] = raw_text
    return result
