"""Records that can carry attachments, keyed by the name the API uses."""

from django.apps import apps

# api name -> (app_label.Model, kinds allowed on it)
TARGETS = {
    "product_unit": ("inventory.ProductUnit", ["purchase_receipt", "other"]),
    "expense": (
        "events.ExpenseLineItem",
        ["payment_receipt", "client_invoice", "other"],
    ),
    "general_expense": (
        "payment.GeneralExpense",
        ["payment_receipt", "client_invoice", "other"],
    ),
}


def target_model(name):
    entry = TARGETS.get(name)
    return apps.get_model(entry[0]) if entry else None


def allowed_kinds(name):
    entry = TARGETS.get(name)
    return entry[1] if entry else []
