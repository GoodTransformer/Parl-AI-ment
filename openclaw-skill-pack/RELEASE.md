# Release Process

## Pilot release goals

Ship a reviewable archive of the skill pack with checksums and a documented manual signing step. Do not publish to a public registry during the pilot.

## Release checklist

1. Review diffs in `skills/`, `schemas/`, `docs/`, `examples/`, and `tests/`.
2. Confirm the site copy still matches the five-skill pilot contract.
3. Validate example payloads against the schemas.
4. Review refusal cases for off-domain browsing, unsafe runtime posture, and memory write-back.
5. Update `CHANGELOG.md`.
6. Ensure `LICENSE` has been finalized before any external release.

## Archive creation

Example commands:

```bash
tar -czf parl-ai-ment-openclaw-skill-pack-0.1.0-pilot.tar.gz openclaw-skill-pack
shasum -a 256 parl-ai-ment-openclaw-skill-pack-0.1.0-pilot.tar.gz > parl-ai-ment-openclaw-skill-pack-0.1.0-pilot.sha256
```

## Manual signing

Signing-key provisioning is outside this repository phase. Before any external release:

1. Select the signing mechanism.
2. Sign the release archive and checksum file.
3. Publish the signed artifacts together.
4. Record the signing procedure and signer identity in the release notes.

## Distribution policy

- Pilot distribution is by pinned archive only.
- No auto-update flow.
- No registry install instructions.
- Operators must review release notes and checksums before installing.
