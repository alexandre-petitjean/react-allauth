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
