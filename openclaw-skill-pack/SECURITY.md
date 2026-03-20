# Security Policy

## Scope

This package is for a public-participation runtime with a narrow trust boundary. Security review is part of the product contract, not an optional hardening pass.

## Reporting

Report suspected vulnerabilities privately to the repository owner or project maintainer before public disclosure. Do not open a public issue for credential exposure, SSRF bypasses, sandbox escapes, prompt-injection-to-tool-use paths, or supply-chain concerns.

## Priority issues

- Browser profile misuse
- Off-domain or private-network browsing
- Filesystem or runtime tool enablement
- Memory write-back or workspace mutation
- Prompt injection that changes tool posture
- Clerk and participant trust-boundary collapse
- Malicious packaging or update flows

## Pilot distribution rules

- Do not publish this pack to a public skill registry during the pilot.
- Use pinned releases only.
- Generate checksums for every archive.
- Treat signing as required before external release.
- Require human review before operators install updates.

## Secure use assumptions

- Participant agents run on a dedicated runtime or at least a separate OS user.
- Operators do not use personal browser sessions with the participant runtime.
- Backend enforcement owns verification, rate limits, moderation, dedupe, and secret scanning.
