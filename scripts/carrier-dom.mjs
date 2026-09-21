// Deliberately restricted static HTML tree parser, not a browser emulator.
// Reject constructs requiring HTML error recovery/foreign/template parsing.
// Unsupported pages must not receive a fabricated mechanical PASS.
const fail = message => { throw Object.assign(new Error(message), { code: 'CARRIER_DOM_UNSUPPORTED' }); };
const voids = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const supported = new Set(('html head body title style main section article aside nav header footer div span p a b strong i em small label button input select option optgroup textarea form fieldset legend table caption colgroup col thead tbody tfoot tr th td ul ol li dl dt dd h1 h2 h3 h4 h5 h6 pre code blockquote details summary figure figcaption time progress meter output hr br img meta link base area embed param source track wbr').split(' '));
// A whitelist, not a drifting list of paragraph-closing blocks: HTML's
// tree-builder reparents figures/details and other non-phrasing children.
const paragraphContent = new Set('a b strong i em small span label button input select textarea img br code time progress meter output'.split(' '));
const tableParents = { caption: ['table'], colgroup: ['table'], col: ['colgroup'], thead: ['table'], tbody: ['table'], tfoot: ['table'], tr: ['thead', 'tbody', 'tfoot'], th: ['tr'], td: ['tr'] };
function decode(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
    if (entity[0] === '#') {
      const point = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      if (!point || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) fail('Unsupported HTML character reference');
      return String.fromCodePoint(point);
    }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' }[entity.toLowerCase()];
  });
}
export function parseCarrierDom(html) {
  if (typeof html !== 'string' || html.includes('\0')) fail('HTML must be valid static text');
  const root = { tag: '#document', attrs: {}, children: [] };
  const stack = [root];
  let pos = 0;
  while (pos < html.length) {
    const parent = stack.at(-1);
    if (html.startsWith('<!--', pos)) {
      const end = html.indexOf('-->', pos + 4);
      if (end < 0 || html.slice(pos + 4, end).includes('--')) fail('Malformed HTML comment');
      pos = end + 3; continue;
    }
    const doctype = /^<!doctype\s+html\s*>/i.exec(html.slice(pos));
    if (doctype) { if (stack.length !== 1) fail('Nested doctype'); pos += doctype[0].length; continue; }
    if (html[pos] !== '<') {
      const end = html.indexOf('<', pos);
      const raw = html.slice(pos, end < 0 ? html.length : end);
      if (['table', 'thead', 'tbody', 'tfoot', 'tr', 'colgroup'].includes(parent.tag) && raw.trim()) fail('Table text would be foster-parented');
      parent.children.push({ text: decode(raw) }); pos += raw.length; continue;
    }
    const close = /^<\/([a-z][\w-]*)\s*>/i.exec(html.slice(pos));
    if (close) {
      if (stack.length === 1 || parent.tag !== close[1].toLowerCase()) fail('Implicit or mismatched closing tags are unsupported');
      stack.pop(); pos += close[0].length; continue;
    }
    const opening = /^<([a-z][\w-]*)\b((?:[^<>"']|"[^"]*"|'[^']*')*)>/i.exec(html.slice(pos));
    if (!opening) fail('Malformed or unsupported HTML markup');
    const tag = opening[1].toLowerCase();
    if (!supported.has(tag) || (!voids.has(tag) && /\/\s*$/.test(opening[2]))) fail(`Unsupported static element: ${tag}`);
    if (/[^\s"']\/\s*$/.test(opening[2])) fail('Ambiguous unquoted self-closing attributes are unsupported');
    if ((tag === 'html' && (parent !== root || root.children.some(node => node.tag === 'html'))) || (['head', 'body'].includes(tag) && (parent.tag !== 'html' || parent.children.some(node => node.tag === tag))) || (tag === 'head' && parent.children.some(node => node.tag === 'body')) || (parent.tag === 'head' && !['title', 'style', 'meta', 'link', 'base'].includes(tag))) fail('Document containers must follow explicit HTML/head/body structure');
    if (!paragraphContent.has(tag) && stack.some(node => node.tag === 'p')) fail('HTML paragraph content must stay within the supported phrasing whitelist');
    if (['a', 'button', 'form', 'li', 'option'].includes(tag) && stack.some(node => node.tag === tag)) fail(`Implicit nesting recovery for ${tag} is unsupported`);
    if ((/^h[1-6]$/.test(tag) && stack.some(node => /^h[1-6]$/.test(node.tag))) || (['dt', 'dd'].includes(tag) && stack.some(node => ['dt', 'dd'].includes(node.tag)))) fail('Implicit heading/list closing is unsupported');
    if ((parent.tag === 'select' && !['option', 'optgroup'].includes(tag)) || (parent.tag === 'optgroup' && tag !== 'option') || parent.tag === 'option') fail('Select content that browsers drop or reinterpret is unsupported');
    if (tableParents[tag] && !tableParents[tag].includes(parent.tag)) fail(`Explicit table parent required for ${tag}`);
    if (['table', 'thead', 'tbody', 'tfoot', 'tr', 'colgroup'].includes(parent.tag) && !tableParents[tag]?.includes(parent.tag)) fail('Table foster-parenting is unsupported');
    const attrs = {};
    let remaining = opening[2].replace(/\/\s*$/, '');
    while (remaining.trim()) {
      const match = /^\s+([^\s=<>"'`/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s<>"'`=]+)))?/.exec(remaining);
      if (!match) fail('Malformed HTML attribute');
      const name = match[1].toLowerCase();
      if (Object.hasOwn(attrs, name) || name.startsWith('on')) fail('Duplicate or active HTML attributes are unsupported');
      attrs[name] = decode(match[2] ?? match[3] ?? match[4] ?? '');
      remaining = remaining.slice(match[0].length);
    }
    const node = { tag, attrs, children: [] }; parent.children.push(node); pos += opening[0].length;
    if (['style', 'title', 'textarea'].includes(tag)) {
      const end = new RegExp(`<\\/${tag}\\s*>`, 'ig'); end.lastIndex = pos;
      const match = end.exec(html);
      if (!match) fail(`Unclosed ${tag}`);
      node.children.push({ text: tag === 'style' ? html.slice(pos, match.index) : decode(html.slice(pos, match.index)) });
      pos = end.lastIndex;
    } else if (!voids.has(tag)) stack.push(node);
  }
  if (stack.length !== 1) fail('All non-void HTML elements must explicitly close');
  return root;
}

export function anchoredNodes(root, anchor) {
  if (anchor?.kind !== 'attribute' || typeof anchor.name !== 'string' || typeof anchor.value !== 'string') fail('Expected a registered attribute anchor');
  const matches = [];
  const walk = node => {
    if (node.tag && !['head', 'style'].includes(node.tag)) {
      if (node.attrs[anchor.name.toLowerCase()] === anchor.value) matches.push(node);
      node.children.forEach(walk);
    }
  };
  walk(root); return matches;
}

// Structural carrier intentionally allows target-tool visual tokens/classes,
// stylesheet/head changes. Text, topology and non-visual attributes remain
// business structure; this is NOT a visual fidelity or semantic acceptance test.
export function structuralDom(node, replacements = new Map()) {
  if (replacements.has(node)) return replacements.get(node);
  if (node.text !== undefined) return node.text.trim() ? { text: node.text.replace(/\s+/g, ' ').trim() } : null;
  if (['head', 'style'].includes(node.tag)) return null;
  const attrs = Object.fromEntries(Object.entries(node.attrs).filter(([key]) => !['class', 'style'].includes(key)).sort(([a], [b]) => a.localeCompare(b)));
  return { tag: node.tag, attrs, children: node.children.map(child => structuralDom(child, replacements)).filter(child => child !== null) };
}
