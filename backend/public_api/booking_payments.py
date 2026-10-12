"""Online payment for guest booking requests (storefront & marketplace).

Flow: the guest submits a request with pay_now=True → we create the booking
plus a *pending* Payment and start a Paystack transaction for the deposit
(OrganizationBookingSettings.deposit_percent of the total) → Paystack sends
the guest back to our frontend, which calls the verify endpoint (the
webhook does the same, whichever comes first) → `finalize_payment` marks the
payment completed (which creates the Receipt and updates the booking's
amount_paid via existing signals), sets the booking to "booked", and emails
the guest their confirmation with invoice + receipt.

Money is collected by the platform's Paystack account (PAYSTACK_SECRET_KEY).
"""

import re
from decimal import ROUND_HALF_UP, Decimal
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core import signing
from django.db import transaction
from django.utils import timezone
from loguru import logger

from payment.models import Invoice, Payment, Receipt

TOKEN_SALT = "public-booking-docs"
TOKEN_MAX_AGE = 60 * 60 * 24 * 90  # links in emails stay valid for 90 days
PAYSTACK_CURRENCIES = {"NGN", "GHS", "ZAR", "KES", "USD", "XOF", "EGP", "RWF"}


# ---------------------------------------------------------------- helpers


def deposit_amount(total, percent):
    percent = max(1, min(100, int(percent or 100)))
    amount = Decimal(total) * Decimal(percent) / Decimal(100)
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def safe_return_url(url):
    """Only allow redirects back to our own frontends (no open redirect)."""
    if not url:
        return None
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin in getattr(settings, "CORS_ALLOWED_ORIGINS", []):
        return url
    for pattern in getattr(settings, "CORS_ALLOWED_ORIGIN_REGEXES", []):
        if re.match(pattern, origin):
            return url
    return None


def document_token(booking):
    return signing.dumps({"b": booking.booking_id}, salt=TOKEN_SALT)


def booking_from_token(token):
    from inventory.models import Booking

    try:
        data = signing.loads(token, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE)
    except signing.BadSignature:
        return None
    return Booking.objects.filter(booking_id=data.get("b")).first()


def org_contact(org):
    settings_obj = getattr(org, "booking_settings", None)
    return {
        "name": (getattr(settings_obj, "storefront_name", None) or org.name),
        "phone": org.phone_number or "",
        "email": org.email or "",
        "address": ", ".join(
            p for p in [org.address or "", org.city or "", org.country or ""] if p
        ),
        "logo": org.company_logo.url if org.company_logo else None,
    }


# --------------------------------------------------------------- paystack


def start_payment(booking, email, amount, return_url):
    """Create a pending Payment and a Paystack transaction. Returns
    (authorization_url, reference)."""
    org = booking.organization
    currency = org.currency.code if org.currency else "NGN"
    data = {
        "email": email,
        "amount": int(amount * 100),  # smallest currency unit
        "metadata": {
            "source": "public_booking",
            "booking_id": booking.booking_id,
            "organization_id": org.id,
        },
    }
    if currency in PAYSTACK_CURRENCIES:
        data["currency"] = currency
    if return_url:
        data["callback_url"] = return_url

    resp = requests.post(
        "https://api.paystack.co/transaction/initialize",
        headers={
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        },
        json=data,
        timeout=20,
    )
    body = resp.json() if resp.content else {}
    if resp.status_code != 200 or not body.get("status"):
        raise ValueError(body.get("message") or "Could not start payment.")

    reference = body["data"]["reference"]
    Payment.objects.create(
        booking=booking,
        organization=org,
        amount=amount,
        status="pending",
        invoice_id=reference,  # Paystack reference (existing convention)
    )
    return body["data"]["authorization_url"], reference


def verify_with_paystack(reference):
    resp = requests.get(
        f"https://api.paystack.co/transaction/verify/{reference}",
        headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"},
        timeout=20,
    )
    body = resp.json() if resp.content else {}
    if resp.status_code != 200 or not body.get("status"):
        return None
    return body.get("data") or None


def finalize_payment(reference, paystack_data, request=None):
    """Idempotently complete a public booking payment. Returns the Booking,
    or None if the reference isn't ours / the charge didn't succeed."""
    if not paystack_data or paystack_data.get("status") != "success":
        return None

    with transaction.atomic():
        payment = (
            Payment.objects.select_for_update()
            .select_related("booking", "booking__organization")
            .filter(invoice_id=reference, booking__isnull=False)
            .first()
        )
        if payment is None:
            return None
        booking = payment.booking
        if payment.status == "completed":
            return booking  # already processed (webhook vs. redirect)

        paid = Decimal(paystack_data.get("amount", 0)) / Decimal(100)
        if paid < payment.amount:
            logger.warning(
                f"Paystack {reference}: paid {paid} < expected {payment.amount}"
            )
            payment.amount = paid
        payment.status = "completed"
        payment.payment_date = timezone.now()
        payment.save()  # signals: create Receipt, sync booking.amount_paid

        booking.refresh_from_db()
        if booking.status in ("request", "processed"):
            booking.status = "booked"
            booking.save(update_fields=["status", "payment_status"])

        invoice = Invoice.objects.filter(booking=booking).first()
        if invoice is not None and payment.invoice_record_id is None:
            Payment.objects.filter(pk=payment.pk).update(invoice_record=invoice)

        just_completed = True

    if just_completed:
        try:
            send_booking_email(booking, paid=True, request=request)
        except Exception as e:  # never fail the payment over email
            logger.error(f"Booking {booking.booking_id} confirmation email failed: {e}")
    return booking


# ------------------------------------------------------------ confirmation


def confirmation_payload(booking, request=None):
    org = booking.organization
    token = document_token(booking)
    payment = (
        Payment.objects.filter(booking=booking, status="completed")
        .order_by("-payment_date")
        .first()
    )
    receipt = getattr(payment, "receipt", None) if payment else None

    def absolute(path):
        return request.build_absolute_uri(path) if request else path

    currency = org.currency
    return {
        "booking_id": booking.booking_id,
        "status": booking.status,
        "payment_status": booking.payment_status,
        "total_amount": str(Decimal(str(booking.total_amount))),
        "amount_paid": str(Decimal(str(booking.amount_paid))),
        "balance": str(
            max(
                Decimal(str(booking.total_amount)) - Decimal(str(booking.amount_paid)),
                Decimal("0"),
            )
        ),
        "currency_symbol": currency.symbol if currency else "",
        "currency_code": currency.code if currency else "",
        "guest_email": booking.client.email if booking.client else "",
        "vendor": org_contact(org),
        "invoice_url": absolute(f"/api/public/bookings/{token}/invoice/"),
        "receipt_url": (
            absolute(f"/api/public/bookings/{token}/receipt/") if receipt else None
        ),
    }


def _money(symbol, value):
    return f"{symbol}{Decimal(value):,.2f}"


def send_booking_email(booking, paid, request=None):
    """Email the guest: payment confirmation (with invoice + receipt) or a
    request acknowledgement. Sent from the platform address, branded with the
    vendor's company-profile details."""
    from notification.services import EmailService
    from payment.utils import generate_invoice_pdf, generate_receipt_pdf

    client = booking.client
    to = client.email if client else None
    if not to:
        return False

    data = confirmation_payload(booking, request)
    vendor = data["vendor"]
    symbol = data["currency_symbol"]
    base = getattr(settings, "PUBLIC_API_BASE_URL", "").rstrip("/")
    # Absolute links: from the request when we have one, else the setting.
    link = lambda url: (  # noqa: E731
        url if not url or url.startswith("http") else f"{base}{url}"
    )

    contact_lines = "".join(
        f"<li>{label}: <strong>{value}</strong></li>"
        for label, value in [
            ("Phone", vendor["phone"]),
            ("Email", vendor["email"]),
            ("Address", vendor["address"]),
        ]
        if value
    )

    if paid:
        subject = f"Booking #{booking.booking_id} confirmed – {vendor['name']}"
        intro = (
            f"<p>Thank you! Your payment of <strong>{_money(symbol, data['amount_paid'])}</strong> "
            f"was received and your booking with <strong>{vendor['name']}</strong> is "
            f"<strong>booked</strong>.</p>"
            f"<p>Total: {_money(symbol, data['total_amount'])} · "
            f"Balance due: {_money(symbol, data['balance'])}</p>"
        )
    else:
        subject = f"Request #{booking.booking_id} received – {vendor['name']}"
        intro = (
            f"<p>Thanks for your request. <strong>{vendor['name']}</strong> will review it "
            f"and get back to you with a quotation and next steps.</p>"
        )

    docs = ""
    if paid:
        doc_links = [f'<a href="{link(data["invoice_url"])}">Download invoice</a>']
        if data["receipt_url"]:
            doc_links.append(
                f'<a href="{link(data["receipt_url"])}">Download receipt</a>'
            )
        docs = f"<p>{' · '.join(doc_links)} (also attached).</p>"

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a">
      <h2 style="margin-bottom:4px">{vendor['name']}</h2>
      <p style="font-size:18px;margin:16px 0">Your booking ID: <strong>#{booking.booking_id}</strong></p>
      <p style="color:#64748b">Please keep this ID — quote it whenever you contact the vendor.</p>
      {intro}
      {docs}
      <h3 style="margin-top:24px">Questions? Contact {vendor['name']}</h3>
      <ul>{contact_lines or '<li>The vendor will contact you.</li>'}</ul>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">Sent via NeoOps on behalf of {vendor['name']}.</p>
    </div>
    """
    text = (
        f"{subject}\nBooking ID: #{booking.booking_id} (keep this for reference).\n"
        f"Contact {vendor['name']}: {vendor['phone']} {vendor['email']}"
    )

    attachments = []
    if paid:
        invoice = Invoice.objects.filter(booking=booking).first()
        if invoice is not None:
            try:
                attachments.append(
                    {
                        "filename": f"invoice_{invoice.invoice_number}.pdf",
                        "content": generate_invoice_pdf(invoice).getvalue(),
                    }
                )
            except Exception as e:
                logger.error(f"Invoice PDF for booking {booking.booking_id}: {e}")
        receipt = (
            Receipt.objects.filter(payment__booking=booking)
            .order_by("-created_at")
            .first()
        )
        if receipt is not None:
            try:
                attachments.append(
                    {
                        "filename": f"receipt_{receipt.receipt_number}.pdf",
                        "content": generate_receipt_pdf(receipt).getvalue(),
                    }
                )
            except Exception as e:
                logger.error(f"Receipt PDF for booking {booking.booking_id}: {e}")

    return EmailService.send(to, subject, text, html, attachments=attachments)
