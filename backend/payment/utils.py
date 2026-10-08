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
    billed_by.append(Paragraph(organization.name, box_title_style))
    if organization.address:
        billed_by.append(
            Paragraph(organization.address.replace("\n", "<br/>"), box_text_style)
        )
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
            billed_to.append(
                Paragraph(client.address.replace("\n", "<br/>"), box_text_style)
            )
    else:
        billed_to.append(Paragraph("No client specified", box_text_style))

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
    billed_by.append(Paragraph(organization.name, box_title_style))
    if organization.address:
        billed_by.append(
            Paragraph(organization.address.replace("\n", "<br/>"), box_text_style)
        )
    if organization.phone_number:
        billed_by.append(Paragraph(organization.phone_number, box_text_style))
    if organization.email:
        billed_by.append(Paragraph(organization.email, box_text_style))

    billed_to = [Paragraph("BILLED TO", box_header_style)]
    client = quotation.client
    if client:
        client_name = f"{client.business_name}".strip()
        billed_to.append(Paragraph(client_name, box_title_style))
        if client.email:
            billed_to.append(Paragraph(client.email, box_text_style))
        if client.phone_number:
            billed_to.append(Paragraph(client.phone_number, box_text_style))
        if client.address:
            billed_to.append(
                Paragraph(client.address.replace("\n", "<br/>"), box_text_style)
            )
    else:
        billed_to.append(Paragraph("No client specified", box_text_style))

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
        "TitleStyle",
        parent=styles["Heading1"],
        fontSize=24,
        textColor=colors.HexColor("#10b981"),  # Green for success/receipt
        spaceAfter=12,
    )

    elements = []

    # Header
    elements.append(Paragraph(f"RECEIPT: {receipt.receipt_number}", title_style))
    elements.append(Paragraph(f"Organization: {organization.name}", styles["Normal"]))
    elements.append(
        Paragraph(f"Date: {receipt.issue_date.strftime('%Y-%m-%d')}", styles["Normal"])
    )
    elements.append(Spacer(1, 0.5 * inch))

    # Client Info
    elements.append(Paragraph("<b>Received From:</b>", styles["Normal"]))
    client_name = f"{receipt.payment.booking.client.business_name}"
    elements.append(Paragraph(client_name, styles["Normal"]))
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
        ["Description", "Value"],
        ["Booking ID", f"#{booking.booking_id}"],
        ["Booking Title", booking.booking_title or "N/A"],
        ["Payment Method", "Completed Transaction"],
        ["Total Booking Amount", f"{currency_symbol}{total_amount:,.2f}"],
        ["Amount Paid in this Transaction", f"{currency_symbol}{amount_paid_now:,.2f}"],
        ["Total Amount Paid to Date", f"{currency_symbol}{total_paid_to_date:,.2f}"],
        ["Balance Remaining", f"{currency_symbol}{balance_left:,.2f}"],
        ["Payment Status", payment_type],
    ]

    table = Table(data, colWidths=[2.5 * inch, 3 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ecfdf5")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#065f46")),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1fae5")),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
            ]
        )
    )
    elements.append(table)

    # Footer
    if receipt.notes:
        elements.append(Spacer(1, 0.5 * inch))
        elements.append(Paragraph("<b>Notes:</b>", styles["Normal"]))
        elements.append(Paragraph(receipt.notes, styles["Normal"]))

    elements.append(Spacer(1, 0.5 * inch))
    elements.append(
        Paragraph(
            "Thank you for your business!",
            ParagraphStyle("CenterStyle", parent=styles["Normal"], alignment=TA_CENTER),
        )
    )

    # Logo Footer
    logo = _load_logo_flowable(organization)
    if logo:
        elements.append(Spacer(1, 0.5 * inch))
        elements.append(logo)

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
