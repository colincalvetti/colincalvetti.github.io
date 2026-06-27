# [colincalvetti.github.io](https://colincalvetti.github.io)

Personal site built with [Jekyll](https://jekyllrb.com/) and deployed on GitHub Pages.
Content is rendered at build time from data files; JavaScript adds progressive enhancement for the skills cloud and scroll hints.

## Structure

```
_config.yml          Site metadata, profile, and contact links
_data/
  projects.yml       Projects (favorite: true also appears on the home page)
  skills.yml         Skill chips
_layouts/default.html
_includes/            head, header, footer, project-card, scroll-box, social-links
index.html           Home page
projects.html        Projects page (/projects/)
404.html
assets/              Stylesheet, scripts, favicon, headshot
```

## Editing content

- **Projects / skills:** edit `_data/projects.yml` and `_data/skills.yml`.
- **Profile, social links, metadata:** edit `_config.yml`.

No templates need to change to add or update entries.

## Running locally

A `Gemfile` is used for local development only (gitignored). GitHub Pages builds the site with its built-in Jekyll — no plugins required.

```bash
bundle install
bundle exec jekyll serve
```

Then open <http://localhost:4000>.

## Deploying to GitHub Pages

Push to the `main` branch of `colincalvetti/colincalvetti.github.io`. GitHub Pages will build and publish automatically.

Before pushing, verify locally:

```bash
bundle exec jekyll build
```

Built output goes to `_site/` (gitignored). Do not commit `_site/`, `.jekyll-cache/`, or `.DS_Store`.
