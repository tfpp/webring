function mod(x, y) {
  return ((x % y) + y) % y;
}

function getCircular(list, index, offset) {
  const i = mod(index + offset, list.length);

  return list[i];
}

function renderLink(link) {
  const template = document.getElementById("webring-link");
  const clone = template.content.cloneNode(true);
  
  const a = clone.querySelector("a");
  a.innerText = link.title;
  a.href = link.homepage;

  return clone;
}

function getSelfIndex(list, host) {
  return list.findIndex((value) => value.host === host);
}

function renderWebring() {
  const referrer = new URL(document.referrer);
  const ring = JSON.parse(document.getElementById("ring").innerText).webring;
  const container = document.querySelector("#webring");
  const i = getSelfIndex(ring, referrer.host);

  container.appendChild(renderLink(getCircular(ring, i, -1)));
  container.appendChild(renderLink(getCircular(ring, i,  1)));
}