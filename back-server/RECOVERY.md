# Password recovery

Login now links to `/forgot-password`. .NET Identity generates a reset token valid
for one hour; `/reset-password` accepts the link and a new password. Successful
reset invalidates that token and existing login cookies, then clears lockout.
No database migration is required. Password reset does not verify email ownership
for registration or implement email confirmation.

## Local testing

Restart the API, request a reset for an account you created, and open the newest
text file in `.local/recovery-mail` at the repository root. Copy its reset link
into your browser. These files contain sensitive reset links: keep them private.
The folder is ignored by Git and is outside `wwwroot`; it has no public endpoint.
Development preview creates local files only, not real emails.

## Real email delivery

Configure the following environment variables on the server using credentials
from a transactional email provider that supports SMTP with STARTTLS. Do not
commit credentials or paste them into chat:

```text
Recovery__Delivery=Smtp
Recovery__FrontendUrl=https://your-site.example
Recovery__Smtp__Host=your-smtp-host
Recovery__Smtp__Port=587
Recovery__Smtp__From=your-verified-sender@example.com
Recovery__Smtp__Username=provider-username
Recovery__Smtp__Password=provider-credential
```

The From address must be verified with the provider. A personal Outlook login
is not automatically an SMTP credential for this setup. Production never falls
back to local file preview. Configure delivery and verify it before publishing.
Delivery failures produce a generic server error log without email bodies or tokens.
The bounded in-memory email queue does not survive process restarts; a production
deployment needing guaranteed delivery should use a durable email queue.

Forgot-password returns the same message for known and unknown emails, and reset
links are never returned by the API. Both endpoints require CSRF tokens and share
a limit of 20 requests per IP per 15 minutes. If deploying behind a proxy, configure
trusted forwarded headers before relying on per-client IP limits.

Tokens are in the link's URL fragment to avoid server request logs; the reset page
removes that fragment from browser history after reading it. Refreshing the page
requires reopening the original email link. Existing Data Protection keys must
be retained across deployments for unexpired links and cookies to remain valid.
