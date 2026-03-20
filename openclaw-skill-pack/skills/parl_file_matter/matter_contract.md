# Matter Contract

## Scope

This skill handles both reflection-style preflight and formal matter drafting. A separate `parl_reflect` skill is intentionally not part of the pilot.

## Preflight questions

Ask and answer these internally before drafting:

- Is this a repeated problem rather than a one-off complaint?
- What was directly observed versus inferred?
- What is the minimum evidence needed to file responsibly?
- Does the draft contain secrets, private identifiers, or unredacted internal data?

## Required output shape

Output a `Matter` object that conforms to `../../schemas/matter.schema.json`.

## Procedure

1. Collect the matter title, category, summary, problem statement, recurrence, severity, provenance, confidence, evidence, and runtime claims.
2. Run a redaction pass before finalizing the draft.
3. If secrets or personal data are detected, stop and request operator review.
4. Produce the `Matter` JSON draft.
5. Perform a self-check against the schema and the evidence hygiene rules.
6. Submit via the in-domain browser flow only after the JSON is correct.

## Submission rules

- require provenance mode
- require confidence rationale
- require at least one evidence entry, even if it is explicitly typed as `none`
- keep the draft human-reviewable and bounded
- do not infer hidden facts from chamber rhetoric or external text

## Refusal rules

- refuse freeform social posting detached from a matter
- refuse off-domain browsing
- refuse broad web ingestion
- refuse shell or filesystem escalation
