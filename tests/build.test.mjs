// Run after `npm run build`. These assertions inspect artifacts; they never build or fetch sites.
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import test from 'node:test';

const dist = new URL('../dist/', import.meta.url);
const read = (path) => readFile(new URL(path, dist), 'utf8');
const members = JSON.parse(await readFile(new URL('../src/data/members.json', import.meta.url), 'utf8'))
  .map((member) => ({ ...member, url: new URL(member.url).href }));

// Inspect opening tags/attributes independently of whitespace, attribute order,
// quote style, and Astro's generated class names. This is not an HTML snapshot.
function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, 'gi'))].map(([, source]) => {
    const attributes = {};
    for (const match of source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
    }
    return attributes;
  });
}
const tokens = (value = '') => value.toLowerCase().split(/\s+/);

function assertStatic(html) {
  assert.equal(tags(html, 'script').length, 0, 'no client scripts or serialized ring scripts');
  assert.equal(tags(html, 'astro-island').length, 0, 'no hydrated islands');
  assert.doesNotMatch(html, /document\.referrer|renderWebring|assets\/js\/webring\.js|webring-link|onload\s*=/i);
  assert.doesNotMatch(html, /\{%|\{\{|site\.data\.webring/, 'no old Jekyll template copy');
}

function assertCanonical(html, expected) {
  const canonical = tags(html, 'link').filter((link) => tokens(link.rel).includes('canonical'));
  assert.equal(canonical.length, 1);
  assert.equal(canonical[0].href, expected);
}

test('homepage has working member hrefs and custom-domain canonical, without old client rendering', async () => {
  const html = await read('index.html');
  const links = tags(html, 'a');
  for (const member of members) {
    const matches = links.filter((link) => link.href === member.url);
    assert.equal(matches.length, 1, `one directory link for ${member.id}`);
    assert.equal(matches[0].target, '_blank');
    assert.ok(tokens(matches[0].rel).includes('noopener'));
  }
  assertCanonical(html, 'https://tfpp.pw/');
  assertStatic(html);
  assert.doesNotMatch(html, /<template\b|>\s*Go\s*<|lorem ipsum|your (?:site|blog) here/i, 'no old template/placeholder copy');
});

for (const [index, member] of members.entries()) {
  test(`${member.id} embed follows circular data order at the top level`, async () => {
    const html = await read(`members/${member.id}/index.html`);
    const links = tags(html, 'a');
    for (const direction of ['prev', 'next']) {
      const neighbors = links.filter((link) => tokens(link.rel).includes(direction));
      if (members.length === 1) {
        assert.equal(neighbors.length, 0, 'singleton has no self-links');
      } else {
        const offset = direction === 'prev' ? -1 : 1;
        const expected = members[(index + offset + members.length) % members.length];
        assert.equal(neighbors.length, 1, `one ${direction} link`);
        assert.equal(neighbors[0].href, expected.url);
        assert.equal(neighbors[0].target, '_top');
      }
    }
    const home = links.find((link) => link.href === '/' || link.href === 'https://tfpp.pw/');
    assert.ok(home, 'directory fallback link');
    assert.equal(home.target, '_top');
    assert.ok(tags(html, 'meta').some((meta) => meta.name === 'robots' && /\bnoindex\b/i.test(meta.content)), 'embed is noindex');
    assertCanonical(html, `https://tfpp.pw/members/${member.id}/`);
    assertStatic(html);
  });
}

test('404 and GitHub Pages custom-domain artifacts exist', async () => {
  const html = await read('404.html');
  assert.ok(tags(html, 'html').length, '404 is an HTML document');
  assert.ok(tags(html, 'a').some((link) => link.href === '/'), '404 links home');
  assertStatic(html);
  assert.equal((await read('CNAME')).trim(), 'tfpp.pw');
  assert.ok((await stat(new URL('.nojekyll', dist))).isFile());
});

test('JetBrains Mono is emitted locally and referenced by generated CSS', async () => {
  const files = await readdir(dist, { recursive: true });
  const fonts = files.filter((file) => /jetbrains-mono.*\.woff2?$/i.test(file));
  assert.ok(fonts.length > 0, 'local JetBrains Mono font output');
  for (const file of fonts) assert.ok((await stat(new URL(file.replaceAll('\\', '/'), dist))).size > 0);
  const stylesheets = await Promise.all(files.filter((file) => file.endsWith('.css'))
    .map((file) => read(file.replaceAll('\\', '/'))));
  // Astro inlines small stylesheets; both representations are valid static output.
  const html = await read('index.html');
  const inlineStyles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]);
  const css = [...stylesheets, ...inlineStyles].join('\n');
  assert.match(css, /@font-face/);
  assert.match(css, /JetBrains Mono/i);
  assert.match(css, /url\([^)]*jetbrains-mono[^)]*\.woff2?/i);
  assert.doesNotMatch(css, /https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)/i);
});
