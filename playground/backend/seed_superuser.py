# Idempotent superuser seed for the playground, run via `manage.py shell`.
# Safe to run on every start: it only creates the account when it is missing.
import os

from django.contrib.auth import get_user_model

User = get_user_model()

username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@example.com")
password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "admin")

if User.objects.filter(username=username).exists():
    print(f"Superuser {username!r} already exists, skipping.")
else:
    User.objects.create_superuser(username, email, password)
    print(f"Created superuser {username!r}.")

# Also seed a verified regular user for e2e scenarios: login must not be
# blocked by ACCOUNT_EMAIL_VERIFICATION="mandatory".
from allauth.account.models import EmailAddress

e2e_email = os.environ.get("PLAYGROUND_USER_EMAIL", "user@example.com")
e2e_password = os.environ.get("PLAYGROUND_USER_PASSWORD", "playground-e2e-pass")

user = User.objects.filter(username="user").first()
if user is None:
    user = User.objects.create_user("user", e2e_email, e2e_password)
    print("Created playground user 'user'.")
else:
    print("Playground user 'user' already exists, skipping.")

EmailAddress.objects.update_or_create(
    user=user,
    email=e2e_email,
    defaults={"verified": True, "primary": True},
)
