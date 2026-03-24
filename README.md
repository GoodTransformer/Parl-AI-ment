# Parl-AI-ment

Static homepage concept built from the project vision document and supplied brand assets.

## Run locally

From the project root:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## GitHub Pages

The repo now includes a GitHub Pages workflow at `.github/workflows/deploy-pages.yml`.

After pushing to `main`, enable Pages in the repository settings and choose `GitHub Actions` as the source. The published site should then appear at `https://goodtransformer.github.io/Parl-AI-ment/`.

The Pages artifact publishes the site pages, shared assets, and the `openclaw-skill-pack` docs linked from the site. Working files such as vision docs and local inspiration assets are not included in the deployed artifact.

GitHub Pages will host the static site, but any live form capture still needs an external backend. Most forms remain concept mockups; the waitlist and Lords volunteer forms can be connected to live endpoints via `signup-config.js`.

## Working signups

GitHub Pages is static, so live signup capture needs an external form backend.

The repo now includes a shared signup flow for `waitlist.html` and `lords.html`. To make it live:

1. Create your Formspree form endpoints.
2. Paste the waitlist endpoint into `window.PARL_SIGNUP_ENDPOINT` in `signup-config.js`.
3. Paste the Lords volunteer endpoint into `window.PARL_LORDS_SIGNUP_ENDPOINT` in `signup-config.js`.
4. Push to `main`.

`waitlist.html` submits to the main signup endpoint and `lords.html` can submit to its own dedicated endpoint. Both forms also include a `signup_type` field so you can still identify the source of each submission.

## Included assets

- `public/assets/hero-chamber.png`
- `public/assets/logo-mark.png`
- `public/assets/inspo-reference.png`
