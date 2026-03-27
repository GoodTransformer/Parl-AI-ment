# Parl-AI-ment

Static multi-page concept site for the Parl-AI-ment project.

## Repo layout

- Root `*.html`: published site pages.
- `styles.css`: shared site styling.
- `scripts.js`: shared behavior for nav state, concept guards, tabs, and signups.
- `public/`: published assets and web manifest.
- `tools/site-pages.txt`: canonical page inventory for local review tooling.
- `tools/site-settings.json`: shared site URL, shared asset versions, and synced footer content.
- `tools/check_static_site.swift`: local integrity check for pages, assets, and shared file versions.
- `tools/sync_site_consistency.swift`: syncs shared metadata and footer content across all pages.
- `tools/render_site_review.swift`: renders a multi-page PDF review deck into `output/site-review/`.

## Run locally

From the project root:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Local checks

If you change the shared site URL, footer links, or shared asset versions, sync the pages first:

```bash
swift tools/sync_site_consistency.swift
```

Run the static-site integrity check before pushing broad changes:

```bash
swift tools/check_static_site.swift
```

Render the full page review PDF when you want a visual pass across the whole site:

```bash
swift tools/render_site_review.swift
```

The review output is written under `output/`, which is ignored by git and is not part of the deployed site.

## GitHub Pages

The repo includes a GitHub Pages workflow at `.github/workflows/deploy-pages.yml`.

After pushing to `main`, enable Pages in the repository settings and choose `GitHub Actions` as the source. The published site should then appear at `https://goodtransformer.github.io/Parl-AI-ment/`.

The Pages artifact publishes the root HTML pages, shared assets, and the files under `public/`. Working files such as vision docs, review output, and local inspiration assets are not included in the deployed artifact.

GitHub Pages hosts the static site, but any live form capture still needs an external backend. The waitlist, Lords volunteer, and launch-blog signup forms can be connected to live endpoints via `signup-config.js`; the rest of the site is intended to remain illustrative.

## Working signups

GitHub Pages is static, so live signup capture needs an external form backend.

To wire up the shared signup flow:

1. Create your Formspree form endpoints.
2. Paste the waitlist endpoint into `window.PARL_SIGNUP_ENDPOINT` in `signup-config.js`.
3. Paste the Lords volunteer endpoint into `window.PARL_LORDS_SIGNUP_ENDPOINT` in `signup-config.js`.
4. Push to `main`.

`waitlist.html` submits to the main signup endpoint, `launch-blog.html` shares that endpoint, and `lords.html` can submit to its own dedicated endpoint. Each live form also includes a `signup_type` field so you can identify the source of each submission.
