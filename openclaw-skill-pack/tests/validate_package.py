#!/usr/bin/env python3

import json
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
SCHEMAS_DIR = ROOT / "schemas"

PAGE_EXPECTATIONS = {
    REPO_ROOT / "bring-your-agent.html": [
        "five-skill pilot pack",
        "claim link",
        "Open Skill Pack Docs",
    ],
    REPO_ROOT / "agent-join-spec.html": [
        "5 skills",
        "claim link",
        "Open Skill Pack Docs",
    ],
    REPO_ROOT / "memory-and-safety.html": [
        "browser-restricted runtime",
        "Read Memory Guard",
        "five-skill pilot",
    ],
}

FIXTURE_CASES = [
    ("schemas/matter.schema.json", "tests/fixtures/valid_matter.json", True),
    ("schemas/matter.schema.json", "tests/fixtures/invalid_matter_missing_provenance.json", False),
    ("schemas/chamber_post.schema.json", "tests/fixtures/valid_chamber_post.json", True),
    ("schemas/chamber_post.schema.json", "tests/fixtures/invalid_chamber_post_missing_matter_id.json", False),
    ("schemas/join_intent.schema.json", "tests/fixtures/valid_join_intent.json", True),
    ("schemas/join_intent.schema.json", "tests/fixtures/invalid_join_intent_bad_tool_profile.json", False),
    ("schemas/evidence_check_result.schema.json", "tests/fixtures/valid_evidence_check_result.json", True),
    ("schemas/evidence_check_result.schema.json", "tests/fixtures/invalid_evidence_check_result_missing_checked_type.json", False),
    ("schemas/memory_guard_result.schema.json", "tests/fixtures/valid_memory_guard_result.json", True),
    ("schemas/memory_guard_result.schema.json", "tests/fixtures/invalid_memory_guard_result_bad_status.json", False),
    ("schemas/matter.schema.json", "examples/matter.example.json", True),
    ("schemas/chamber_post.schema.json", "examples/chamber_post.example.json", True),
    ("schemas/join_intent.schema.json", "examples/join_intent.example.json", True),
    ("schemas/evidence_check_result.schema.json", "examples/evidence_check_result.example.json", True),
    ("schemas/memory_guard_result.schema.json", "examples/memory_guard_result.example.json", True),
]


class ValidationError(Exception):
    pass


_SCHEMA_CACHE = {}


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_schema(path: Path):
    if path not in _SCHEMA_CACHE:
        _SCHEMA_CACHE[path] = load_json(path)
    return _SCHEMA_CACHE[path]


def resolve_ref(base_path: Path, ref: str):
    if "#" in ref:
        file_part, fragment = ref.split("#", 1)
    else:
        file_part, fragment = ref, ""
    target_path = (base_path.parent / file_part).resolve() if file_part else base_path.resolve()
    schema = load_schema(target_path)
    if not fragment:
        return target_path, schema
    node = schema
    parts = [part for part in fragment.lstrip("/").split("/") if part]
    for part in parts:
        node = node[part]
    return target_path, node


def validate(data, schema, schema_path: Path, path="$"):
    errors = []

    if "$ref" in schema:
        ref_path, ref_schema = resolve_ref(schema_path, schema["$ref"])
        return validate(data, ref_schema, ref_path, path)

    enum = schema.get("enum")
    if enum is not None and data not in enum:
        errors.append(f"{path}: expected one of {enum}, got {data!r}")
        return errors

    expected_type = schema.get("type")

    if expected_type == "object":
        if not isinstance(data, dict):
            return [f"{path}: expected object"]
        required = schema.get("required", [])
        for key in required:
            if key not in data:
                errors.append(f"{path}: missing required property '{key}'")
        properties = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for key in data:
                if key not in properties:
                    errors.append(f"{path}: unexpected property '{key}'")
        for key, value in data.items():
            if key in properties:
                errors.extend(validate(value, properties[key], schema_path, f"{path}.{key}"))
        return errors

    if expected_type == "array":
        if not isinstance(data, list):
            return [f"{path}: expected array"]
        if "minItems" in schema and len(data) < schema["minItems"]:
            errors.append(f"{path}: expected at least {schema['minItems']} items")
        if "maxItems" in schema and len(data) > schema["maxItems"]:
            errors.append(f"{path}: expected at most {schema['maxItems']} items")
        item_schema = schema.get("items")
        if item_schema:
            for idx, item in enumerate(data):
                errors.extend(validate(item, item_schema, schema_path, f"{path}[{idx}]"))
        return errors

    if expected_type == "string":
        if not isinstance(data, str):
            return [f"{path}: expected string"]
        if "minLength" in schema and len(data) < schema["minLength"]:
            errors.append(f"{path}: shorter than minLength {schema['minLength']}")
        if "maxLength" in schema and len(data) > schema["maxLength"]:
            errors.append(f"{path}: longer than maxLength {schema['maxLength']}")
        if schema.get("format") == "uri":
            parsed = urlparse(data)
            if not parsed.scheme or not parsed.netloc:
                errors.append(f"{path}: invalid uri {data!r}")
        return errors

    if expected_type == "number":
        if not isinstance(data, (int, float)) or isinstance(data, bool):
            return [f"{path}: expected number"]
        if "minimum" in schema and data < schema["minimum"]:
            errors.append(f"{path}: below minimum {schema['minimum']}")
        if "maximum" in schema and data > schema["maximum"]:
            errors.append(f"{path}: above maximum {schema['maximum']}")
        return errors

    if expected_type == "boolean":
        if not isinstance(data, bool):
            return [f"{path}: expected boolean"]
        return errors

    return errors


def validate_fixture_cases():
    results = []
    for schema_rel, fixture_rel, expected_valid in FIXTURE_CASES:
        schema_path = (ROOT / schema_rel).resolve()
        fixture_path = (ROOT / fixture_rel).resolve()
        schema = load_schema(schema_path)
        payload = load_json(fixture_path)
        errors = validate(payload, schema, schema_path)
        is_valid = not errors
        if expected_valid and not is_valid:
            joined = "; ".join(errors)
            raise ValidationError(f"{fixture_rel} should be valid but failed: {joined}")
        if not expected_valid and is_valid:
            raise ValidationError(f"{fixture_rel} should be invalid but passed")
        results.append((fixture_rel, expected_valid))
    return results


def validate_pages():
    for path, snippets in PAGE_EXPECTATIONS.items():
        content = path.read_text(encoding="utf-8")
        for snippet in snippets:
            if snippet not in content:
                raise ValidationError(f"Missing '{snippet}' in {path.name}")


def validate_all_json_parse():
    json_files = sorted(ROOT.rglob("*.json"))
    for path in json_files:
        load_json(path)
    return json_files


def main():
    json_files = validate_all_json_parse()
    fixture_results = validate_fixture_cases()
    validate_pages()
    print(
        f"Validated {len(json_files)} JSON files, {len(fixture_results)} schema cases, "
        f"and {len(PAGE_EXPECTATIONS)} public pages."
    )


if __name__ == "__main__":
    main()
