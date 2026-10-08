import os
import requests
from loguru import logger
from django.conf import settings
from decouple import config


class WhatsAppService:
    """
    Service for interacting with Meta's official WhatsApp Cloud API.
    """

    @staticmethod
    def send_template(
        to_phone_number, template_name, language_code="en", components=None
    ):
        """
        Sends a WhatsApp template message to the specified phone number.
        """
        access_token = getattr(
            settings, "WA_ACCESS_TOKEN", config("WA_ACCESS_TOKEN", default="")
        )
        phone_number_id = getattr(
            settings, "WA_PHONE_NUMBER_ID", config("WA_PHONE_NUMBER_ID", default="")
        )

        if not access_token or not phone_number_id:
            logger.warning(
                "[WHATSAPP SIMULATOR] Missing Meta credentials. Logging message instead."
            )
            logger.info(
                f"To: {to_phone_number} | Template: {template_name} | Components: {components}"
            )
            return True

        url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        # Ensure the phone number starts with country code without '+'
        if to_phone_number.startswith("+"):
            to_phone_number = to_phone_number[1:]

        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone_number,
            "type": "template",
            "template": {"name": template_name, "language": {"code": language_code}},
        }

        if components:
            payload["template"]["components"] = components

        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            logger.info(
                f"WhatsApp Success: Sent template '{template_name}' to {to_phone_number}"
            )
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"WhatsApp Failure: {e}")
            if hasattr(e, "response") and e.response is not None:
                logger.error(f"Response data: {e.response.text}")
            return False

    @staticmethod
    def send_text(to_phone_number, message_text):
        """
        Sends a simple text message. (Note: Only possible within 24h window of user messaging the business).
        """
        access_token = getattr(
            settings, "WA_ACCESS_TOKEN", config("WA_ACCESS_TOKEN", default="")
        )
        phone_number_id = getattr(
            settings, "WA_PHONE_NUMBER_ID", config("WA_PHONE_NUMBER_ID", default="")
        )

        if not access_token or not phone_number_id:
            logger.warning(
                "[WHATSAPP SIMULATOR] Missing Meta credentials. Logging message instead."
            )
            logger.info(f"To: {to_phone_number} | Text: {message_text}")
            return True

        url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        if to_phone_number.startswith("+"):
            to_phone_number = to_phone_number[1:]

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone_number,
            "type": "text",
            "text": {"preview_url": False, "body": message_text},
        }

        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            logger.info(f"WhatsApp Success: Sent text to {to_phone_number}")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"WhatsApp Failure: {e}")
            return False
