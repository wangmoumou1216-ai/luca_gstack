import { chromium } from 'playwright';

// This v1 adapter transports self-contained originals. Multi-file/deferred
// resource graphs must get a separate explicit closure; never silently omit
// them or rewrite their URLs. Existing source CSP may make a URL unreachable.
export async function inspectOriginalResources(bytes, { browser: suppliedBrowser } = {}) {
  const browser = suppliedBrowser ?? await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false });
  try {
    await context.route('**/*', route => route.abort('blockedbyclient'));
    const page = await context.newPage();
    const evidence = await page.evaluate(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const trimAscii = value => value.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '');
      const parsePolicy = node => {
        const directives = {};
        for (const part of (node.getAttribute('content') ?? '').split(';')) {
          // CSP grammar uses ASCII whitespace. JavaScript trim()/\s also
          // accept NBSP and other Unicode separators that Chromium does not,
          // which could falsely make an ineffective policy excuse a resource.
          const asciiTrimmed = trimAscii(part);
          const [name, ...values] = asciiTrimmed.split(/[\t\n\f\r ]+/);
          if (name && !Object.hasOwn(directives, name.toLowerCase())) directives[name.toLowerCase()] = values.map(value => value.toLowerCase());
        }
        return directives;
      };
      const deniedBySource = (kind, allSchemes, policies) => {
        const names = { image: ['img-src'], font: ['font-src'], style: ['style-src-elem', 'style-src'], script: ['script-src-elem', 'script-src'], frame: ['frame-src', 'child-src'], media: ['media-src'] }[kind];
        if (!names) return false;
        return policies.some(policy => {
          const list = [...names, 'default-src'].map(name => policy[name]).find(v => v !== undefined);
          return list !== undefined && (list.length === 0 || list.every(token => ["'none'", "'unsafe-inline'", "'unsafe-eval'", ...(allSchemes ? [] : ['data:'])].includes(token)));
        });
      };
      const references = [];
      const add = (kind, value, location, policies, unsupported = false) => {
        // Unicode trim changes URL semantics: an NBSP-prefixed "data:" URL
        // is a relative request in Chromium, not an embedded data resource.
        value = typeof value === 'string' ? trimAscii(value) : '';
        if (!value || value.startsWith('#')) return;
        // Stylesheet data URLs can hide nested dependencies; v1 refuses them.
        const embedded = !unsupported && /^data:/i.test(value) && kind !== 'style';
        references.push({ kind, location, embedded, denied_by_source_csp: !embedded && deniedBySource(kind, unsupported || /^data:/i.test(value), policies), unsupported });
      };
      const scanCssValue = (value, kind, location, policies) => {
        const imageSet = /(?:^|[^\w-])(?:-webkit-)?image-set\s*\(/i.test(value);
        let urlCount = 0;
        for (const match of value.matchAll(/url\([\t\n\f\r ]*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|([^)]*))[\t\n\f\r ]*\)/gi)) {
          urlCount++;
          add(kind, match[1] ?? match[2] ?? match[3], location, policies);
        }
        // image-set() also accepts bare quoted candidates. Until every candidate
        // can be closed, reject sets with no url() candidate or any quoted
        // candidate left after removing the parsed url(...) forms.
        const withoutUrls = value.replace(/url\([\t\n\f\r ]*(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^)]*)[\t\n\f\r ]*\)/gi, '');
        if (imageSet && (urlCount === 0 || /["']/.test(withoutUrls))) add(kind, 'unparsed-image-set', location, policies, true);
        // CSS escapes can spell url() without the literal token (for example
        // u\72l(...)). Fail closed instead of trusting the lexical matcher.
        if (value.includes('\\')) add(kind, 'escaped-css-value', location, policies, true);
      };
      const scanCss = (css, policies) => {
        const lexical = css.replace(/\/\*[\s\S]*?\*\//g, '');
        if (/@\s*(?:import|\\)/i.test(lexical)) add('style', 'unparsed-import', 'css import', policies, true);
        if (lexical.includes('\\')) add('style', 'escaped-css', 'css escape', policies, true);
        const sheet = new CSSStyleSheet();
        try { sheet.replaceSync(css); } catch { add('unknown', 'unparsed-css', 'css parse', policies, true); return; }
        // CSSOM may silently discard an unsupported/invalid at-rule instead
        // of throwing. A discarded url() is still source evidence of an
        // external dependency, so compare the lexical and serialized token
        // counts before trusting the rules exposed below.
        const urlTokenCount = value => [...value.matchAll(/url\s*\(/gi)].length;
        const imageSetTokenCount = value => [...value.matchAll(/(?:-webkit-)?image-set\s*\(/gi)].length;
        const serialized = [...sheet.cssRules].map(rule => rule.cssText).join('\n');
        if (urlTokenCount(lexical) !== urlTokenCount(serialized) || imageSetTokenCount(lexical) !== imageSetTokenCount(serialized)) add('unknown', 'dropped-css-resource', 'css parse', policies, true);
        const rules = entries => { for (const rule of entries) {
          if (rule.style) for (const name of rule.style) {
            const value = rule.style.getPropertyValue(name);
            if (name.startsWith('--') && value.includes('\\')) add('unknown', 'escaped-custom-property', 'custom css', policies, true);
            scanCssValue(value, rule.type === CSSRule.FONT_FACE_RULE ? 'font' : 'image', 'css value', policies);
          }
          // Some resource-capable at-rules (for example @counter-style
          // symbols: url(...)) expose cssText but neither .style nor nested
          // .cssRules. Scan their serialized body instead of silently
          // treating an unknown CSSOM rule shape as self-contained.
          if (!rule.style && !rule.cssRules && typeof rule.cssText === 'string') scanCssValue(rule.cssText, 'image', 'css at-rule', policies);
          if (rule.cssRules) rules(rule.cssRules);
        } };
        rules(sheet.cssRules);
      };
      const svgHrefKinds = new Map([['feimage', 'image'], ['use', 'image'], ['mpath', 'image'], ['textpath', 'image'], ['lineargradient', 'image'], ['radialgradient', 'image'], ['pattern', 'image'], ['filter', 'image'], ['clippath', 'image'], ['mask', 'image'], ['marker', 'image']]);
      const presentationUrls = ['fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker-start', 'marker-mid', 'marker-end', 'cursor'];
      const walk = (root, inheritedPolicies = []) => {
        const policies = [...inheritedPolicies];
        for (const node of root.querySelectorAll('*')) {
        const tag = node.tagName.toLowerCase();
        const httpEquiv = (node.getAttribute('http-equiv') ?? '').toLowerCase();
        const normalizedHttpEquiv = httpEquiv.trim();
        // A CSP meta is effective only as actual head metadata. In particular,
        // a meta nested under <noscript> must not retroactively excuse later
        // resources when the preserved page runs with scripting enabled.
        if (tag === 'meta' && node.parentElement === doc.head && httpEquiv === 'content-security-policy') policies.push(parsePolicy(node));
        if (tag === 'template') { walk(node.content, policies); continue; }
        if (node.hasAttribute('style')) scanCss(`x{${node.getAttribute('style')}}`, policies);
        if (tag === 'style') scanCss(node.textContent, policies);
        for (const attr of node.getAttributeNames()) if (attr.startsWith('on') && /\bimport\b/.test(node.getAttribute(attr))) add('unknown', 'unclosed-handler-graph', `${tag} ${attr}`, policies, true);
        if (tag === 'script') {
          const type = (node.getAttribute('type') ?? '').trim().toLowerCase();
          const isSvg = node.namespaceURI === 'http://www.w3.org/2000/svg';
          const scriptUrls = ['src', 'href', 'xlink:href'].filter(attr => node.hasAttribute(attr)).map(attr => trimAscii(node.getAttribute(attr)));
          if (node.hasAttribute('src')) add('script', node.getAttribute('src'), 'script src', policies);
          for (const attr of ['href', 'xlink:href']) if (node.hasAttribute(attr)) add('script', node.getAttribute(attr), `script ${attr}`, policies);
          // SVG ignores `src` and can execute its inline body; SVG href and
          // xlink:href can also carry data scripts. Dynamic import() works in
          // classic scripts and event handlers. Lexical false positives are
          // acceptable in this fail-closed single-file profile.
          if (((isSvg || !node.hasAttribute('src')) && /\bimport\b/.test(node.textContent)) || (type === 'module' && (isSvg || !node.hasAttribute('src')) && /\bexport\b/.test(node.textContent)) || scriptUrls.some(url => /^data:/i.test(url))) add('unknown', 'unclosed-script-graph', 'script graph', policies, true);
          if (type === 'importmap') add('unknown', 'unclosed-import-map', 'import map', policies, true);
        }
        if (tag === 'link' && node.hasAttribute('href')) {
          const rel = (node.getAttribute('rel') ?? '').toLowerCase().split(/\s+/), as = (node.getAttribute('as') ?? '').toLowerCase();
          const kind = rel.includes('stylesheet') ? 'style' : rel.includes('modulepreload') ? 'script' : rel.includes('icon') ? 'image' : rel.includes('preload') ? ({font:'font',script:'script',style:'style',image:'image',audio:'media',video:'media'}[as] ?? 'unknown') : 'unknown';
          add(kind, node.getAttribute('href'), 'link href', policies);
        }
        if (['img', 'image', 'input'].includes(tag)) for (const attr of ['src', 'href', 'xlink:href']) if (node.hasAttribute(attr)) add('image', node.getAttribute(attr), `${tag} ${attr}`, policies);
        if (tag === 'img') for (const attr of ['lowsrc', 'dynsrc']) if (node.hasAttribute(attr)) add('image', node.getAttribute(attr), `${tag} ${attr}`, policies);
        if (['body', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'].includes(tag) && node.hasAttribute('background')) add('image', node.getAttribute('background'), `${tag} background`, policies);
        if (['audio', 'video', 'source', 'track'].includes(tag)) { if (node.hasAttribute('src')) add('media', node.getAttribute('src'), `${tag} src`, policies); if (node.hasAttribute('poster')) add('image', node.getAttribute('poster'), 'video poster', policies); }
        if (node.hasAttribute('srcset')) add('image', 'unparsed-srcset', 'srcset', policies, true);
        if (node.hasAttribute('imagesrcset')) add('image', 'unparsed-imagesrcset', 'link imagesrcset', policies, true);
        if (svgHrefKinds.has(tag)) for (const attr of ['src', 'href', 'xlink:href']) if (node.hasAttribute(attr)) add(svgHrefKinds.get(tag), node.getAttribute(attr), `${tag} ${attr}`, policies);
        for (const attr of presentationUrls) if (node.hasAttribute(attr)) scanCssValue(node.getAttribute(attr), 'image', `${tag} ${attr}`, policies);
        // Even the bare `0;https://...` form navigates in Chromium. A
        // refresh directive is active navigation regardless of URL spelling.
        if (tag === 'meta' && normalizedHttpEquiv === 'refresh') add('unknown', 'meta-refresh', 'meta refresh', policies, true);
        if (['iframe', 'object', 'embed', 'base'].includes(tag)) add('unknown', 'embedded-context', tag, policies, true);
      } };
      walk(doc);
      return { inspected: references.length, embedded: references.filter(r => r.embedded).length, preserved_but_source_csp_blocked: references.filter(r => r.denied_by_source_csp).length, unresolved: references.filter(r => !r.embedded && !r.denied_by_source_csp) };
    }, bytes.toString('utf8'));
    if (evidence.unresolved.length) throw Object.assign(new Error(`Original has ${evidence.unresolved.length} unresolved external/multi-file resource references; preserve the original and supply an audited asset closure, never export HTML alone as a complete package`), { code: 'ORIGINAL_ASSETS_REQUIRED', evidence });
    return { ...evidence, scope: 'static resources only; source scripts not executed; original URLs/CSP unchanged' };
  } finally { await context.close(); if (!suppliedBrowser) await browser.close(); }
}
