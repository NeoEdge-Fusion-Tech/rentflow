import re

with open("backend/users/models.py", "r") as f:
    content = f.read()

# Import make_password, check_password at the top
if (
    "from django.contrib.auth.hashers import make_password, check_password"
    not in content
):
    content = content.replace(
        "from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin",
        "from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin\nfrom django.contrib.auth.hashers import make_password, check_password",
    )

# Add password field to Client
client_old = """    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active",
    )
    created_at = models.DateTimeField(auto_now_add=True)"""

client_new = """    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active",
    )
    password = models.CharField(max_length=128, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)"""

content = content.replace(client_old, client_new)

# Add set_password and check_password methods to Client
client_methods_old = '''    def __str__(self):
        if self.client_type == "business":
            return self.business_name or "Unnamed Business"
        return f"{self.first_name} {self.last_name}"'''

client_methods_new = '''    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        if not self.password:
            return False
        return check_password(raw_password, self.password)

    def __str__(self):
        if self.client_type == "business":
            return self.business_name or "Unnamed Business"
        return f"{self.first_name} {self.last_name}"'''

content = content.replace(client_methods_old, client_methods_new)

with open("backend/users/models.py", "w") as f:
    f.write(content)
