import os
from loguru import logger
import boto3
from botocore.exceptions import ClientError
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from django.conf import settings
from decouple import config

# Configure loguru to output to file only in local environment
if config('ENV_MODE', default='local') == 'local':
    try:
        logger.add(
            "logs/notifications.log", 
            rotation="10 MB", 
            retention="10 days", 
            level="INFO",
            format="{time} {level} {message}",
            backtrace=True,
            diagnose=True
        )
    except OSError:
        pass

class EmailService:
    @staticmethod
    def send(to_email, subject, body_text, body_html=None):
        """
        Intelligent Email Dispatcher.
        """
        environment = getattr(settings, 'ENVIRONMENT', config('ENVIRONMENT', default='local')).lower()
        if environment == 'local' and getattr(settings, 'EMAIL_VENDOR', 'resend').lower() != 'resend':
            logger.info(f"[LOCAL EMAIL SIMULATOR] To: {to_email} | Subject: {subject} | Body: {body_text}")
            return True

        vendor = getattr(settings, 'EMAIL_VENDOR', 'resend').lower()
        
        if vendor == 'resend':
            return EmailService.send_via_resend(to_email, subject, body_text, body_html)
        elif vendor == 'ses':
            return EmailService.send_via_ses(to_email, subject, body_text, body_html)
        elif vendor == 'sendgrid':
            return EmailService.send_via_sendgrid(to_email, subject, body_text, body_html)
        else:
            logger.warning(f"Unknown email vendor: {vendor}, logging to console.")
            logger.info(f"To: {to_email} | Subject: {subject} | Body: {body_text}")
            return True

    @staticmethod
    def send_via_resend(to_email, subject, body_text, body_html=None):
        try:
            import resend
            resend.api_key = getattr(settings, 'RESEND_API_KEY', config('RESEND_API_KEY', default=''))
            if not resend.api_key or resend.api_key == 're_mock_key':
                # Use the user's hardcoded mock key as requested if env is missing
                resend.api_key = "••••••••••••••••••••••••••••••••••••"
                
            r = resend.Emails.send({
              "from": config('DEFAULT_FROM_EMAIL', default='onboarding@resend.dev'),
              "to": to_email,
              "subject": subject,
              "html": body_html or f"<p>{body_text}</p>"
            })
            logger.info(f"Resend Success: Sent email to {to_email} - Response: {r}")
            return True
        except Exception as e:
            logger.error(f"Resend Failure: {str(e)}")
            return False

    @staticmethod
    def send_via_ses(to_email, subject, body_text, body_html=None):
        try:
            client_ses = boto3.client('ses', region_name=config('AWS_REGION', default='us-east-1'))
            response = client_ses.send_email(
                Destination={'ToAddresses': [to_email]},
                Message={
                    'Body': {
                        'Text': {'Charset': 'UTF-8', 'Data': body_text},
                        'Html': {'Charset': 'UTF-8', 'Data': body_html or body_text},
                    },
                    'Subject': {'Charset': 'UTF-8', 'Data': subject},
                },
                Source=config('DEFAULT_FROM_EMAIL', default='noreply@neoinventory.com'),
            )
            logger.info(f"SES Success: Sent email to {to_email} - MessageId: {response['MessageId']}")
            return True
        except ClientError as e:
            logger.error(f"SES Failure: {e.response['Error']['Message']}.")
            return False

    @staticmethod
    def send_via_sendgrid(to_email, subject, body_text, body_html=None):
        try:
            sg = SendGridAPIClient(config('SENDGRID_API_KEY', default=''))
            message = Mail(
                from_email=config('DEFAULT_FROM_EMAIL', default='noreply@neoinventory.com'),
                to_emails=to_email,
                subject=subject,
                html_content=body_html or body_text)
            
            response = sg.send(message)
            logger.info(f"SendGrid Success: Sent to {to_email} - Status: {response.status_code}")
            return True
        except Exception as sg_e:
            logger.error(f"SendGrid Failure: Could not send email to {to_email}. Error: {str(sg_e)}")
            return False


class SMSService:
    @staticmethod
    def send(phone_number, body):
        vendor = getattr(settings, 'SMS_VENDOR', 'local').lower()
        if vendor == 'local':
            return SMSService.send_via_local(phone_number, body)
        return True
        
    @staticmethod
    def send_via_local(phone_number, body):
        logger.info(f"[SMS DISPATCH SIMULATOR] To: {phone_number} | Message: {body}")
        return True

def dispatch_email(to_email, subject, body_text, body_html=None):
    """Backwards compatibility stub."""
    return EmailService.send(to_email, subject, body_text, body_html)

def dispatch_sms(phone_number, body):
    """Backwards compatibility stub."""
    return SMSService.send(phone_number, body)

from django.template.loader import render_to_string

def send_credit_alert_email(user, current_credits, topup_url):
    """
    Sends a low credit alert email using HTML templates.
    """
    subject = "NeoInventory - Low Credit Alert"
    body_text = f"Hello {user.first_name},\n\nYour organization's credit balance is running low ({current_credits} credits).\nPlease top up your account at {topup_url}."
    body_html = render_to_string('emails/credit_alert.html', {
        'user': user,
        'current_credits': current_credits,
        'topup_url': topup_url
    })
    dispatch_email(to_email=user.email, subject=subject, body_text=body_text, body_html=body_html)
