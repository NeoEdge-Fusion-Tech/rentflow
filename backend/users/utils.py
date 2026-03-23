import random
import string
from django.utils import timezone
from datetime import timedelta
from .models import OTP
from notification.services import dispatch_email

def generate_otp(user, purpose):
    # Invalidate previous un-used OTPs for this purpose
    OTP.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)
    
    code = ''.join(random.choices(string.digits, k=6))
    expires_at = timezone.now() + timedelta(minutes=15)
    
    otp = OTP.objects.create(
        user=user,
        code=code,
        purpose=purpose,
        expires_at=expires_at
    )
    return otp

def send_verification_email(user):
    otp = generate_otp(user, 'email_verification')
    subject = "Verify your RentFlow Account"
    body = f"Hello {user.first_name},\n\nYour verification code is: {otp.code}\n\nThis code will expire in 15 minutes."
    dispatch_email(to_email=user.email, subject=subject, body_text=body)

def send_password_reset_email(user):
    otp = generate_otp(user, 'password_reset')
    subject = "RentFlow Password Reset"
    body = f"Hello {user.first_name},\n\nSomeone requested a password reset for your account.\nYour reset code is: {otp.code}\n\nIf this was not you, please ignore this email."
    dispatch_email(to_email=user.email, subject=subject, body_text=body)
