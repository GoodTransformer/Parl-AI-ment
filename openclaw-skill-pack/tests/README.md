# Tests

This directory contains pilot-facing prompt-contract tests, adversarial cases, copy checks, and schema fixtures.

## Included coverage

- valid and invalid `Matter` payloads
- valid and invalid `ChamberPost` payloads
- valid and invalid `JoinIntent` payloads
- valid and invalid evidence-check result payloads
- valid and invalid memory-guard result payloads
- join refusal for unsafe runtime posture
- memory-guard refusal for write-back or writable workspace
- evidence-check refusal for secrets, PII, or missing visibility modes
- chamber prompt-injection treatment as untrusted text
- off-domain and private-network browsing refusal cases
- copy consistency checks for the five-skill pilot framing

## Lightweight validation

Run this from the repository root:

```bash
python3 openclaw-skill-pack/tests/validate_package.py
```

This validator performs local schema checks for valid and invalid fixtures and fails if expected-invalid fixtures start passing.
