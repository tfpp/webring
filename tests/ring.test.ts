import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getNeighbors, validateMembers } from '../src/lib/ring.ts';

const entry = (id = 'alpha', url = `https://${id}.pw/`) => ({ id, url });

test('valid data preserves ring order and normalizes URL/domain case', () => {
  assert.deepEqual(validateMembers([entry('first', 'https://EXAMPLE.PW'), entry('second')]), [
    { id: 'first', url: 'https://example.pw/', domain: 'example.pw' },
    { id: 'second', url: 'https://second.pw/', domain: 'second.pw' },
  ]);
  assert.deepEqual(validateMembers([entry('my-blog-2')])[0], {
    id: 'my-blog-2', url: 'https://my-blog-2.pw/', domain: 'my-blog-2.pw',
  });
});

test('checked-in data validates and retains its declared order', () => {
  const data = JSON.parse(readFileSync(new URL('../src/data/members.json', import.meta.url), 'utf8'));
  const members = validateMembers(data);
  assert.ok(members.length > 0);
  assert.deepEqual(members.map(({ id }) => id), data.map((entry: { id: string }) => entry.id));
});

test('empty and non-array inputs reject', () => {
  for (const input of [[], null, undefined, {}, 'members', 42]) {
    assert.throws(() => validateMembers(input), /at least one member/);
  }
});

test('malformed entries and missing fields reject', () => {
  for (const value of [null, undefined, [], 'alpha', 42]) {
    assert.throws(() => validateMembers([value]), /must be an object/);
  }
  for (const value of [{}, { url: 'https://alpha.pw/' }, { id: 12, url: 'https://alpha.pw/' }]) {
    assert.throws(() => validateMembers([value]), /URL-safe id/);
  }
  for (const url of [undefined, null, 12, '', 'not a URL', '/relative', ' https://alpha.pw/', 'https://alpha.pw/ ']) {
    assert.throws(() => validateMembers([{ id: 'alpha', url }]), /valid URL/);
  }
});

test('IDs must be lowercase URL-safe slugs', () => {
  for (const id of ['', 'Alpha', 'ALPHA', 'two words', 'a_b', '-alpha', 'alpha-', 'alpha--beta', '../alpha', 'a/b', 'café']) {
    assert.throws(() => validateMembers([entry(id)]), /URL-safe id/, id);
  }
});

test('duplicate IDs and case-normalized domains reject', () => {
  assert.throws(() => validateMembers([entry('same'), entry('same', 'https://different.pw/')]), /Duplicate member id/);
  assert.throws(() => validateMembers([entry('one', 'https://ALPHA.PW/a'), entry('two', 'https://alpha.pw/b')]), /Duplicate member domain: alpha\.pw/);
});

test('unsafe URLs reject', () => {
  for (const url of ['http://alpha.pw/', 'javascript:alert(1)', 'data:text/html,hello', 'ftp://alpha.pw/', 'https://user@alpha.pw/', 'https://user:secret@alpha.pw/', 'https://alpha.pw:8443/']) {
    assert.throws(() => validateMembers([entry('alpha', url)]), /HTTPS without credentials or a custom port/, url);
  }
});

test('non-.pw and invalid hostnames reject', () => {
  for (const url of ['https://example.com/', 'https://pw/', 'https://notpw/', 'https://alpha.pw.evil.com/', 'https://127.0.0.1/', 'https://bad_name.pw/', 'https://-bad.pw/', 'https://bad-.pw/']) {
    assert.throws(() => validateMembers([entry('alpha', url)]), /\.pw domain/, url);
  }
});

test('three or more members navigate in data order with circular wrap', () => {
  for (const ids of [['alpha', 'beta', 'gamma'], ['alpha', 'beta', 'gamma', 'delta']]) {
    const members = validateMembers(ids.map((id) => entry(id)));
    for (const [index, member] of members.entries()) {
      const neighbors = getNeighbors(members, member.id);
      assert.strictEqual(neighbors.current, member);
      assert.strictEqual(neighbors.previous, members[(index + members.length - 1) % members.length]);
      assert.strictEqual(neighbors.next, members[(index + 1) % members.length]);
    }
  }
});

test('two members have the same other member on both sides', () => {
  const members = validateMembers([entry('alpha'), entry('beta')]);
  for (const [index, member] of members.entries()) {
    assert.deepEqual(getNeighbors(members, member.id), {
      current: member, previous: members[1 - index], next: members[1 - index],
    });
  }
});

test('singleton has no self-link neighbors', () => {
  const members = validateMembers([entry()]);
  assert.deepEqual(getNeighbors(members, 'alpha'), { current: members[0], previous: null, next: null });
});

test('unknown members reject, including an empty ring', () => {
  assert.throws(() => getNeighbors(validateMembers([entry()]), 'missing'), /Unknown member: missing/);
  assert.throws(() => getNeighbors([], 'missing'), /Unknown member: missing/);
});
