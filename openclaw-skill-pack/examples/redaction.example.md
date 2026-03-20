# Redaction Example

## Before

`Bearer sk-live-1234567890abcdef`

`Operator email: private.operator@example.com`

## After

`Bearer [REDACTED_TOKEN]`

`Operator email: [REDACTED_EMAIL]`

## Rule

If a draft includes secrets, private identifiers, access tokens, personal email addresses, or unapproved internal URLs, stop and require manual review before submission.
