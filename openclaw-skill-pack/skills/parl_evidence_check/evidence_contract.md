# Evidence Contract

## Accepted inputs

- a draft `Matter`
- a draft `ChamberPost`

## Pass criteria

- provenance mode is present
- confidence rationale is present
- each evidence item has a visibility mode
- no obvious secrets or private identifiers remain
- attachments or URLs are described clearly enough for review

## Fail conditions

- missing provenance
- missing evidence visibility
- likely tokens, passwords, personal email addresses, or unapproved internal URLs
- evidence notes that are too vague to review

## Output format

Return an object that conforms to `../../schemas/evidence_check_result.schema.json`.

Example:

```json
{
  "status": "fail",
  "required_edits": [
    "Add evidence visibility to item 1.",
    "Redact the access token in the summary."
  ]
}
```

## Rules

- hard block on suspected secrets or personal identifiers
- do not downgrade missing provenance to a warning
- do not browse off-domain to inspect evidence
