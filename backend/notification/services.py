import os
from loguru import logger
import boto3
from botocore.exceptions import ClientError
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from django.conf import settings

# Configure loguru to output to console gracefully
logger.add(
    "logs/notifications.log", 
    rotation="10 MB", 
    retention="10 days", 
    level="INFO",
    format="{time} {level} {message}",
    backtrace=True,
    diagnose=True
)

def dispatch_email(to_email, subject, body_text, body_html=None):
    """
    Intelligent Email Dispatcher.
    Local: Log it. Production: Try SES -> Fallback to SendGrid.
    """
    environment = getattr(settings, 'ENVIRONMENT', os.environ.get('ENVIRONMENT', 'local')).lower()
    
    if environment == 'local':
        logger.info(f"[LOCAL EMAIL SIMULATOR] To: {to_email} | Subject: {subject} | Body: {body_text}")
        return True
        
    # Production / Staging Environment
    try:
        # Attempt AWS SES
        client_ses = boto3.client('ses', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        response = client_ses.send_email(
            Destination={'ToAddresses': [to_email]},
            Message={
                'Body': {
                    'Text': {'Charset': 'UTF-8', 'Data': body_text},
                    'Html': {'Charset': 'UTF-8', 'Data': body_html or body_text},
                },
                'Subject': {'Charset': 'UTF-8', 'Data': subject},
            },
            Source=os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@rentflow.com'),
        )
        logger.info(f"SES Success: Sent email to {to_email} - MessageId: {response['MessageId']}")
        return True
    except ClientError as e:
        logger.error(f"SES Failure: {e.response['Error']['Message']}. Failing over to SendGrid.")
        
        # Fallback to SendGrid
        try:
            sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
            message = Mail(
                from_email=os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@rentflow.com'),
                to_emails=to_email,
                subject=subject,
                html_content=body_html or body_text)
            
            response = sg.send(message)
            logger.info(f"SendGrid Success: Fallback sent to {to_email} - Status: {response.status_code}")
            return True
        except Exception as sg_e:
            logger.error(f"SendGrid Critical Failure: Could not send fallback email to {to_email}. Error: {str(sg_e)}")
            return False

def dispatch_sms(phone_number, body):
    """
    SMS Dispatcher. Actively simulates using loguru since no live SMS vendor is configured.
    """
    logger.info(f"[SMS DISPATCH SIMULATOR] To: {phone_number} | Message: {body}")
    return True

from django.template.loader import render_to_string

def send_credit_alert_email(user, current_credits, topup_url):
    """
    Sends a low credit alert email using HTML templates.
    """
    subject = "NeoEvent - Low Credit Alert"
    body_text = f"Hello {user.first_name},\n\nYour organization's credit balance is running low ({current_credits} credits).\nPlease top up your account at {topup_url}."
    body_html = render_to_string('emails/credit_alert.html', {
        'user': user,
        'current_credits': current_credits,
        'topup_url': topup_url
    })
    dispatch_email(to_email=user.email, subject=subject, body_text=body_text, body_html=body_html)
