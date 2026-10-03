# The Fake Place

A static personal-blog webring at **https://tfpp.pw/**.

Built with Astro and TypeScript. No database, analytics, cookies, client JavaScript,
or production application server. Jekyll and its Ruby toolchain have been removed.

## Development

Use Node **24** (see `.nvmrc`) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Astro. The other commands are:

| Command | Purpose |
| --- | --- |
| `npm run check` | Astro and TypeScript checks |
| `npm test` | Member validation and circular-navigation tests |
| `npm run build` | Generate the static site in `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run verify` | Check, unit-test, build, and test the generated files |

## Members

Edit **`src/data/members.json`**:

```json
[
  { "id": "chris", "url": "https://chris.pw/" },
  { "id": "joe", "url": "https://joe.pw/" }
]
```

- Array order defines previous/next order. The last member wraps around to the first.
- IDs must be unique lowercase slugs. Keep them stable: they appear in embed URLs.
- URLs must be HTTPS on a unique `.pw` hostname, with no credentials or custom port.
- Hostnames are normalized and domain labels on the homepage are derived from URLs.
- Invalid or empty membership data fails the build.
- With two members, both previous and next lead to the other member.
- With one member, the widget shows only the directory link (no self-links).
- There is no hard limit of ten members. Cards and counts are generated from the list.

Adding a member requires a rebuild/deploy. Existing embedded widgets then update
without changes to the member's blog.

## Embed the webring

Each member has a static navigation page: `/members/chris/`, `/members/joe/`, etc.
For example, Chris can add:

```html
<iframe
  src="https://tfpp.pw/members/chris/"
  title="The Fake Place webring"
  width="360"
  height="80"
  loading="lazy"
  referrerpolicy="no-referrer"
  style="border: 0; width: 100%; max-width: 480px;"
></iframe>
```

Use `/members/joe/` on Joe's blog. No referrer or script is needed. Links use
`target="_top"` so they navigate the containing page, not inside the widget.
If you sandbox the iframe, include `allow-top-navigation-by-user-activation`.
The containing site's CSP must allow `https://tfpp.pw` in `frame-src`.
Keep the widget at least 280px wide. Unknown IDs use the site's 404 page.

**Migration note:** old referrer-based embeds pointing at the root URL must be
updated to the member-specific URLs. The root is now the directory.

## Design and fonts

- Background: `#1C1C1C`
- Text: `#F8F4E9`
- Accent: `#A7C957`
- Title/domains: locally installed Helvetica Neue, then Helvetica/Arial/system sans.
- Labels/numbers/URLs: **JetBrains Mono**, bundled locally via Fontsource.
- No Google Fonts requests. No Helvetica font files are distributed.
- JetBrains Mono's OFL is included at `public/licenses/jetbrains-mono.txt`.
- Styles: `src/styles/global.css`; shared page shell: `src/layouts/Base.astro`.

The homepage deliberately has no description, slogans, or about copy.

## GitHub Pages / tfpp.pw

The checked-in workflow verifies pull requests and deploys pushes to **master**.
Nothing is deployed merely by running the local build.

Before publishing:

1. In this repository's **Settings → Pages**, choose **GitHub Actions** as the source.
2. Configure and verify ownership of the custom domain **tfpp.pw** in GitHub.
3. Set up the apex DNS records at your registrar for GitHub Pages. Follow
   [GitHub's custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
4. Set **tfpp.pw** as the custom domain in Pages settings and enable HTTPS once the certificate is ready.
5. Push to `master` or run the workflow manually from that branch.

`astro.config.mjs` uses `site: 'https://tfpp.pw'` with no repository-path base.
`public/CNAME` contains `tfpp.pw`. This build targets the custom domain root,
**not** `tfpp.github.io/webring/`; that project subpath requires a separate
base-path configuration and corresponding link changes.

The contents of `dist/` can also be served by any static host. Ensure that
`404.html` is used for missing pages and that member pages are allowed in iframes.

## Dependency audit

The initial install reports **GHSA-ch52-4w7c-c8xp** in Astro's transitive
`http-cache-semantics@4.2.0` dependency (npm counts both the package and Astro
as high-severity findings). No patched package version was available when checked.

In the installed Astro version this is imported by the remote-image build cache.
This project uses no remote images, shared authenticated HTTP cache, or server
adapter; deployed output is static HTML/CSS/fonts. Do not interpret that as a fix
to the upstream package. Run `npm audit` when updating dependencies and adopt the
patch when available. Do not use `npm audit fix --force`: its current proposed
resolution is an obsolete Astro major version.

See [the advisory](https://github.com/advisories/GHSA-ch52-4w7c-c8xp).
