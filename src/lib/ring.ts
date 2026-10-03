export interface Member {
  readonly id: string;
  readonly url: string;
  readonly domain: string;
}

/** The input order is the ring order. Invalid data must fail the build. */
export function validateMembers(input: unknown): readonly Member[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error('The ring must contain at least one member.');
  }

  const ids = new Set<string>();
  const domains = new Set<string>();

  return input.map((entry: unknown, index) => {
    const label = `Member ${index + 1}`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`${label} must be an object.`);
    }
    const { id, url } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      throw new Error(`${label} needs a lowercase, URL-safe id.`);
    }
    if (ids.has(id)) throw new Error(`Duplicate member id: ${id}`);
    if (typeof url !== 'string' || url !== url.trim()) {
      throw new Error(`${label} needs a valid URL.`);
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`${label} needs a valid URL.`);
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) {
      throw new Error(`${label} must use HTTPS without credentials or a custom port.`);
    }
    const domain = parsed.hostname;
    if (!domain.endsWith('.pw') || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+pw$/.test(domain)) {
      throw new Error(`${label} must have a .pw domain.`);
    }
    if (domains.has(domain)) throw new Error(`Duplicate member domain: ${domain}`);

    ids.add(id);
    domains.add(domain);
    return { id, url: parsed.href, domain };
  });
}

export function getNeighbors(members: readonly Member[], id: string) {
  const index = members.findIndex((member) => member.id === id);
  const current = members[index];
  if (!current) throw new Error(`Unknown member: ${id}`);

  // A single member gets a directory link, not two links to itself.
  if (members.length === 1) return { current, previous: null, next: null };

  const previous = members[(index - 1 + members.length) % members.length]!;
  const next = members[(index + 1) % members.length]!;
  return { current, previous, next };
}
