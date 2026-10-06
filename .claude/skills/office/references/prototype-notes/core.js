/* One pure factory for Node and the embedded browser. No DOM, filesystem or network access. */
export function createNotesCore(schema) {
  const maxPackageBytes = 100663296; // Shared 96 MiB export/reopen ceiling after safe JSON encoding.
  const fail = (code, message, details = []) => ({ ok: false, code, message, details });
  const ok = value => ({ ok: true, value });
  const clone = value => JSON.parse(JSON.stringify(value));
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const bytes = text => new TextEncoder().encode(text);
  const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes(value))), n => n.toString(16).padStart(2, '0')).join('');
  const paths = ['title','body','details.conditions','details.feedback','details.exceptions','details.recovery','details.visual','details.keyboard'];
  const get = (a, p) => p.startsWith('details.') ? a.details[p.slice(8)] ?? null : a[p];
  const put = (a, p, v) => { if (p.startsWith('details.')) { if (v === null) delete a.details[p.slice(8)]; else a.details[p.slice(8)] = v; } else a[p] = v; };
  const origin = value => ({ last_ai_value: value, human_touched: false, suggested_value: null, suggestion_meta: null, resolved_suggestion_keys: [] });
  const sorted = list => [...new Set(list)].sort();
  const profile = schema['x-luca-semantic-validation'];
  const rules = Array.from({length:13}, (_, i) => 'PN-S' + String(i + 1).padStart(2, '0'));
  function errors(value, rule, at = '$') {
    if (rule.$ref) return errors(value, schema.$defs[rule.$ref.split('/').at(-1)], at);
    const e = [], type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    if (rule.type && !(rule.type === 'integer' ? Number.isSafeInteger(value) : type === rule.type)) return [at + ': type'];
    if ('const' in rule && value !== rule.const) e.push(at + ': const');
    if (rule.enum && !rule.enum.includes(value)) e.push(at + ': enum');
    if (rule.anyOf && !rule.anyOf.some(r => !errors(value, r, at).length)) e.push(at + ': alternatives');
    for (const r of rule.allOf || []) e.push(...errors(value, r, at));
    if (rule.if) e.push(...errors(value, errors(value, rule.if).length ? rule.else || {} : rule.then || {}, at));
    if (type === 'object') {
      for (const k of rule.required || []) if (!Object.hasOwn(value, k)) e.push(at + '.' + k + ': missing');
      for (const k of Object.keys(value)) {
        if (rule.additionalProperties === false && !Object.hasOwn(rule.properties || {}, k)) e.push(at + '.' + k + ': unknown');
        if (rule.properties?.[k]) e.push(...errors(value[k], rule.properties[k], at + '.' + k));
      }
    }
    if (type === 'array') {
      if (value.length < (rule.minItems || 0) || value.length > (rule.maxItems ?? Infinity)) e.push(at + ': count');
      if (rule.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) e.push(at + ': duplicate');
      if (rule.items) value.forEach((v, i) => e.push(...errors(v, rule.items, at + '[' + i + ']')));
    }
    if (type === 'string' && ([...value].length < (rule.minLength || 0) || [...value].length > (rule.maxLength ?? Infinity) || (rule.pattern && !new RegExp(rule.pattern).test(value)))) e.push(at + ': text');
    if (type === 'number' && (!Number.isFinite(value) || value < (rule.minimum ?? -Infinity) || value > (rule.maximum ?? Infinity))) e.push(at + ': range');
    return e;
  }
  // JSON.parse accepts duplicate keys and overflowing numbers; input packages must not.
  function parseJSON(text) {
    let i = 0;
    const ws = () => { while (/\s/.test(text[i] || '') && i < text.length) i++; };
    const string = () => { const start = i++; for (; i < text.length; i++) { if (text[i] === '\\') i++; else if (text[i] === '"') return JSON.parse(text.slice(start, ++i)); } throw Error('unterminated string'); };
    function value() {
      ws();
      if (text[i] === '"') return string();
      if (text[i] === '{') {
        i++; ws(); const keys = new Set();
        if (text[i] === '}') { i++; return; }
        while (i < text.length) {
          if (text[i] !== '"') throw Error('object key'); const key = string();
          if (keys.has(key)) throw Error('duplicate JSON key: ' + key); keys.add(key); ws();
          if (text[i++] !== ':') throw Error('colon'); value(); ws();
          const end = text[i++]; if (end === '}') return; if (end !== ',') throw Error('object separator'); ws();
        }
      } else if (text[i] === '[') {
        i++; ws(); if (text[i] === ']') { i++; return; }
        while (i < text.length) { value(); ws(); const end = text[i++]; if (end === ']') return; if (end !== ',') throw Error('array separator'); }
      } else {
        const token = text.slice(i).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/)?.[0];
        if (!token) throw Error('JSON token'); if (/^-?\d/.test(token) && !Number.isFinite(Number(token))) throw Error('non-finite JSON number'); i += token.length; return;
      }
      throw Error('unterminated JSON');
    }
    value(); ws(); if (i !== text.length) throw Error('trailing JSON'); return JSON.parse(text);
  }
  function validateNotes(document, context) {
    try {
      if (document?.schema_version !== 1 || document?.runtime_version !== '1.0.0' || document?.content_guideline_version !== '1.0.0') return fail('UNKNOWN_VERSION', '说明版本不支持，请保留原文件。');
      if (profile?.profile !== 'prototype-notes-semantic-v1' || !equal(profile.rules.map(r => r.id), rules)) return fail('UNKNOWN_VERSION', '说明语义校验版本不支持。');
      const e = errors(document, schema);
      if (bytes(JSON.stringify(document)).length > 16777216) e.push('PN-S13 notes: size');
      if (e.length) return fail('INVALID_NOTES', '说明数据无效，请检查字段。', e);
      const registry = Array.isArray(context) ? context : context?.sources;
      if (registry !== undefined) {
        if (!Array.isArray(registry)) return fail('INVALID_NOTES', '说明依据登记无效。');
        if (new Set(registry.map(s => s.id)).size !== registry.length) e.push('PN-S07 sources: duplicate');
        for (const s of registry) if (!s || Object.keys(s).some(k => !['id','title','kind','locator','sha256'].includes(k)) || !['用户确认','设计规格','原型观察'].includes(s.kind) || ![s.id,s.title,s.locator].every(v => typeof v === 'string' && v.trim()) || (s.sha256 && !/^[0-9a-f]{64}$/.test(s.sha256))) e.push('PN-S07 sources: invalid');
      }
      const refs = (item, at) => {
        if (registry === undefined) return;
        if (item.source_refs.some(id => !registry.some(s => s.id === id))) e.push('PN-S07 ' + at + ': unknown source');
        const kinds = item.evidence_status === 'confirmed' ? ['用户确认','设计规格'] : item.evidence_status === 'observed' ? ['原型观察'] : [];
        if (kinds.length && !item.source_refs.some(id => registry.some(s => s.id === id && kinds.includes(s.kind)))) e.push('PN-S08 ' + at + ': evidence kind');
      };
      const ids = new Set(), numbers = new Set(), units = document.generation_scope?.units || [];
      if (new Set(units.map(u => u.id)).size !== units.length) e.push('PN-S01 units: duplicate');
      if (document.generation_scope && document.generation_scope.base_revision !== document.base_revision) e.push('PN-S06 scope: base');
      if (document.generation_scope) refs({...document.generation_scope, evidence_status:'proposed'}, 'scope');
      for (const a of document.annotations) {
        if (ids.has(a.id) || numbers.has(a.display_number)) e.push('PN-S01 annotations: duplicate identity');
        ids.add(a.id); numbers.add(a.display_number);
        if (document.next_display_number <= a.display_number) e.push('PN-S02 allocator: behind');
        if (a.tombstone && a.tombstone.deleted_revision > a.revision) e.push('PN-S05 tombstone: revision');
        if (a.anchor && (a.anchor.context_id !== a.page_or_state_context.id || (a.anchor.base_revision !== document.base_revision && !a.anchor.requires_rebind))) e.push('PN-S04 anchor: identity');
        for (const k of Object.keys(a.details)) if (!a.field_origins['details.' + k]) e.push('PN-S05 origin: missing');
        refs(a, a.id);
        for (const o of Object.values(a.field_origins)) {
          if (!equal(sorted(o.resolved_suggestion_keys), o.resolved_suggestion_keys)) e.push('PN-S03 history: ordering/unique');
          if ((o.suggested_value === null) !== (o.suggestion_meta === null)) e.push('PN-S03 suggestion: pair');
          if (o.suggestion_meta) refs(o.suggestion_meta, a.id + '.suggestion');
        }
      }
      return e.length ? fail('INVALID_NOTES', '说明数据不一致，请保留原文件。', e) : ok(clone(document));
    } catch (error) { return fail('INVALID_NOTES', '说明数据无法读取，请保留原文件。', [error.message]); }
  }
  function validateGenerationScope({before = null, proposed, scope, bindings, behaviors, sources, dispositions = [], assisted_ids = [], request_kind = null} = {}) {
    try {
      const valid = validateNotes(proposed, sources); if (!valid.ok) return valid;
      if (before) { const prior=validateNotes(before,sources); if(!prior.ok)return prior; if(before.document_id!==proposed.document_id || before.base_revision!==proposed.base_revision)return fail('SOURCE_CHANGED','范围核验的既有说明基线不同。'); }
      const violations = [], coverage = [], assistance_coverage = [], units = scope?.units || [];
      if (request_kind!==null && !['assist-only','generation','mixed'].includes(request_kind)) return fail('SCOPE_VIOLATION','协助或生成请求类型无效。');
      const existingAI=before?.annotations.some(a=>a.creation_origin==='ai' && !a.tombstone), kind=request_kind || (assisted_ids.length?'assist-only':'generation');
      const checkGeneration=kind!=='assist-only' || request_kind===null && assisted_ids.length && existingAI;
      if (kind==='generation' && assisted_ids.length || kind!=='generation' && !assisted_ids.length) return fail('SCOPE_VIOLATION','请求类型必须对应明确的单条授权。');
      if ((checkGeneration || scope) && (!scope || errors(scope, schema.$defs.scope).length || scope.base_revision !== proposed.base_revision || !equal(scope, proposed.generation_scope))) return fail('SCOPE_VIOLATION', '本轮说明范围与原型版本不一致。');
      if (checkGeneration && (!Array.isArray(behaviors) || new Set(behaviors.map(b => b.id)).size !== behaviors.length || !equal(sorted(behaviors.map(b => b.id)), sorted(scope.required_behavior_ids)))) return fail('COVERAGE_GAP', '缺少完整的适用行为清单。');
      if (!bindings || bindings.base_revision !== proposed.base_revision || !Array.isArray(bindings.roots) || !Array.isArray(bindings.targets)) return fail('SCOPE_VIOLATION', '需要实际核对过的目标和区域证据。');
      const previous = new Map((before?.annotations || []).map(a => [a.id, a]));
      if (!Array.isArray(assisted_ids) || assisted_ids.length>1 || new Set(assisted_ids).size!==assisted_ids.length || assisted_ids.some(id=>previous.get(id)?.creation_origin!=='manual' || previous.get(id)?.tombstone)) return fail('SCOPE_VIOLATION','单条协助只能绑定已存在且未删除的人工说明。');
      // The requested denominator is independent of candidate traversal, including omitted candidates.
      for (const id of assisted_ids) {
        const old=previous.get(id), candidates=proposed.annotations.filter(a=>a.id===id), proofs=(bindings.assisted_targets || []).filter(t=>t.annotation_id===id), t=proofs[0];
        if (before.annotations.filter(a=>a.id===id).length!==1 || candidates.length!==1 || proofs.length!==1 || t.context_id!==old.page_or_state_context.id || (old.anchor ? t.match_count!==1 || t.root_match_count!==1 || t.visible===false || !t.ancestor_node_ids.includes(t.root_node_id) || t.locator!==old.anchor.locator || t.root_identity!==old.anchor.root_identity || t.anchor_id!==old.anchor.id || t.instance_key!==old.anchor.instance_key || !equal(t.fingerprint,old.anchor.fingerprint) || old.anchor.requires_rebind || old.anchor.base_revision!==proposed.base_revision : !t.global_rule)) violations.push({annotation_id:id,reason:'assistance requires one existing item, one candidate and a uniquely verified actual target'});
        else assistance_coverage.push({annotation_id:id,context_id:old.page_or_state_context.id,anchor_id:old.anchor?.id || null,target_verified:true,source_refs:clone(candidates[0].source_refs)});
      }
      for (const r of checkGeneration?bindings.roots.filter(r=>r.portal):[]) {
        const lineage=r.portal.trigger_ancestor_node_ids;
        if (!Array.isArray(lineage) || bindings.roots.some(q=>q.portal && lineage.includes(q.node_id))) violations.push({root_anchor_id:r.anchor_id,reason:'portal-to-portal/self trigger chains are unsupported'});
        else if (!bindings.roots.some(q=>q.unit_id===r.unit_id && !q.portal && !q.is_body && q.match_count===1 && lineage.includes(q.node_id))) violations.push({root_anchor_id:r.anchor_id,reason:'portal trigger is outside approved nonportal unit roots'});
      }
      for (const b of checkGeneration?behaviors:[]) {
        const u = units.find(u => u.id === b.unit_id);
        if (!u?.contexts.includes(b.context_id) || !b.action?.trim() || !b.expected?.trim() || !Array.isArray(b.source_refs) || b.source_refs.some(id => !sources?.some(s => s.id === id))) violations.push({behavior_id:b.id,reason:'invalid behavior ownership/source'});
      }
      for (const a of proposed.annotations) {
        const old = previous.get(a.id), inScope = (old || a.generation_scope_id === scope?.id) && units.some(u => u.id === a.scope_unit_id && u.contexts.includes(a.page_or_state_context.id));
        const assisted=old?.creation_origin==='manual' && assisted_ids.includes(a.id);
        if (assisted_ids.length && request_kind!=='mixed' && !assisted && (!old || !equal(old,a))) { violations.push({annotation_id:a.id,reason:'single assistance cannot generate or update another annotation'}); continue; }
        if (assisted) {
          const stable=item=>Object.fromEntries(Object.entries(item).filter(([key])=>!['title','body','details','field_origins','revision','source_refs','evidence_status','implementation_status'].includes(key)));
          if (!equal(stable(old),stable(a))) violations.push({annotation_id:a.id,reason:'assistance cannot change identity, target or deletion'});
          continue;
        }
        if (!checkGeneration) continue;
        if (old && (!inScope || old.creation_origin === 'manual' && !assisted_ids.includes(a.id))) {
          if (!equal(old, a)) violations.push({annotation_id:a.id,reason:'protected outside scope/manual annotation'});
          continue;
        }
        if (a.creation_origin === 'manual' && !assisted_ids.includes(a.id)) { if (!old) violations.push({annotation_id:a.id,reason:'AI cannot create manual annotation'}); continue; }
        const unit = units.find(u => u.id === a.scope_unit_id);
        if (!inScope || !unit?.contexts.includes(a.page_or_state_context.id)) { violations.push({annotation_id:a.id,reason:'unit/context outside scope'}); continue; } // guard:generation-scope
        if (old?.tombstone) continue;
        if (old && (old.display_number !== a.display_number || old.creation_origin !== a.creation_origin || old.generation_scope_id !== a.generation_scope_id || old.scope_unit_id !== a.scope_unit_id)) {
          if (!equal(old, a)) violations.push({annotation_id:a.id,reason:'stable identity/tombstone changed'});
          
        }
        if (!old && (before?.annotations || []).some(o => o.scope_unit_id === a.scope_unit_id && o.page_or_state_context.id === a.page_or_state_context.id && o.behavior_ids.some(id => a.behavior_ids.includes(id)))) violations.push({annotation_id:a.id,reason:'new ID overlaps existing behavior including deletion history'});
        if (a.tombstone) continue;
        if (a.anchor) {
          const matches = bindings.targets.filter(t => t.anchor_id === a.anchor.id);
          const t = matches[0], r = t && bindings.roots.find(r => r.anchor_id === t.root_anchor_id && r.unit_id === unit.id && r.context_id === a.page_or_state_context.id);
          if (matches.length !== 1 || t.match_count !== 1) return fail('ANCHOR_AMBIGUOUS', '说明目标必须唯一。', [a.id]);
          if (!r || !unit.root_anchor_ids.includes(r.anchor_id) || r.match_count !== 1 || r.is_body || r.visible===false || t.visible===false || !r.evidence_refs?.length || !t.evidence_refs?.length || !t.ancestor_node_ids.includes(r.node_id) ||
            t.unit_id !== unit.id || t.context_id !== a.page_or_state_context.id || r.root_identity !== t.root_identity || t.root_identity !== a.anchor.root_identity || t.locator !== a.anchor.locator || t.instance_key !== a.anchor.instance_key || !equal(t.fingerprint,a.anchor.fingerprint) || a.anchor.requires_rebind || a.anchor.base_revision !== scope.base_revision) violations.push({annotation_id:a.id,reason:'actual root/instance/fingerprint ownership mismatch'});
        } else if (a.kind !== 'rule') violations.push({annotation_id:a.id,reason:'missing target'});
        if (!a.behavior_ids.length || a.behavior_ids.some(id => !behaviors.some(b => b.id === id && b.unit_id === unit.id && b.context_id === a.page_or_state_context.id))) violations.push({annotation_id:a.id,reason:'behavior outside unit/context'});
      }
      for (const b of checkGeneration?behaviors:[]) {
        const matches = proposed.annotations.filter(a => !assisted_ids.includes(a.id) && !a.tombstone && !previous.get(a.id)?.tombstone && (a.generation_scope_id === scope?.id || previous.has(a.id)) && a.scope_unit_id === b.unit_id && a.page_or_state_context.id === b.context_id && a.behavior_ids.includes(b.id));
        const pending = dispositions.find(d => d.behavior_id === b.id && d.disposition === 'deferred' && typeof d.reason === 'string' && d.reason.trim() && sources?.some(s => s.id === d.confirmation_ref && s.kind === '用户确认'));
        coverage.push({behavior_id:b.id,annotation_ids:matches.map(a => a.id),source_refs:b.source_refs,states:matches.map(a => ({evidence_status:a.evidence_status,implementation_status:a.implementation_status})),disposition:pending || null});
      }
      if (violations.length) return fail('SCOPE_VIOLATION', '说明超出本次范围或目标不匹配。', {violations,coverage});
      if (coverage.some(c => !c.annotation_ids.length && !c.disposition)) return fail('COVERAGE_GAP', '本次范围还有未覆盖的行为。', {coverage});
      return ok({coverage,assistance_coverage,request_kind:kind,violations,static_valid:true,source_valid:sources !== undefined,generation_valid:!!checkGeneration,assistance_valid:assisted_ids.length===1,delivery_acceptance:'NOT_RUN'});
    } catch (error) { return fail('SCOPE_VIOLATION','范围证据无法读取。',[error.message]); }
  }
  async function suggestionKey(d, a, p, n, refs = a.source_refs) { return hash(JSON.stringify([d.document_id,d.base_revision,a.id,a.binding_revision,p,n,d.provenance.source_revision,sorted(refs),a.page_or_state_context.id])); }
  async function mergeNotes(input = {}) {
    const {previous,current,proposed,scope,bindings,behaviors,sources,assisted_ids = []} = input;
    try {
      for (const d of [previous,current,proposed]) { const v = validateNotes(d,sources); if (!v.ok) return v; }
      if (new Set([previous.document_id,current.document_id,proposed.document_id]).size !== 1) return fail('SOURCE_CHANGED','不同原型的说明不能自动合并。');
      if (previous.notes_revision === current.notes_revision && !equal(previous,current)) return fail('SOURCE_CHANGED','同一修订存在不同分支，请选择要继续的文件。');
      if (current.notes_revision < previous.notes_revision || current.base_revision !== proposed.base_revision) return fail('SOURCE_CHANGED','需要当前说明基线及明确的新范围。');
      if (current.next_display_number < previous.next_display_number || previous.annotations.some(b => !current.annotations.some(c => c.id === b.id && c.display_number === b.display_number))) return fail('SOURCE_CHANGED','历史身份或分配器已改变。');
      const gate = validateGenerationScope({ ...input, before:current }); if (!gate.ok) return gate;
      const out = clone(current), conflicts = [], superseded_suggestions = [], baseline = new Map(previous.annotations.map(a => [a.id,a]));
      for (const n of proposed.annotations) {
        let a = out.annotations.find(a => a.id === n.id);
        if (a && (a.tombstone || !assisted_ids.includes(a.id) && !(scope?.units || []).some(u => u.id === a.scope_unit_id && u.contexts.includes(a.page_or_state_context.id)) || a.creation_origin === 'manual' && !assisted_ids.includes(a.id))) continue;
        if (!a) {
          if (n.tombstone || n.display_number < current.next_display_number) return fail('SCOPE_VIOLATION','新说明不能复用历史编号。',[n.id]);
          a = clone(n); a.field_origins = Object.fromEntries(paths.filter(p => get(a,p) !== null || a.field_origins[p]).map(p => [p,origin(get(a,p))]));
          out.annotations.push(a); out.next_display_number = Math.max(out.next_display_number,a.display_number + 1); continue;
        }
        const old = baseline.get(a.id);
        const changedTarget = (old && (old.binding_revision !== a.binding_revision || !equal(old.anchor,a.anchor) || !equal(old.page_or_state_context,a.page_or_state_context) || previous.base_revision !== current.base_revision)) || !equal(a.anchor,n.anchor) || !equal(a.page_or_state_context,n.page_or_state_context) || a.kind !== n.kind || a.binding_revision !== n.binding_revision;
        const changedSource = current.provenance.source_revision !== proposed.provenance.source_revision || !equal(sorted(a.source_refs),sorted(n.source_refs)) || a.evidence_status !== n.evidence_status || a.implementation_status !== n.implementation_status;
        const before = clone(a);
        for (const p of paths.filter(p => a.field_origins[p] || n.field_origins[p] || get(n,p) !== null)) {
          const o = a.field_origins[p] ||= origin(get(old || a,p)), c = get(a,p), nv = get(n,p), b = o.last_ai_value;
          const key = await suggestionKey({...current,provenance:proposed.provenance}, a,p,nv,n.source_refs);
          if (o.resolved_suggestion_keys.includes(key)) continue;
          const human = a.creation_origin === 'manual' || o.human_touched || c !== b; // guard:human-protection
          if (human) o.human_touched = true;
          if (!changedTarget && !changedSource && c === nv) { o.last_ai_value = nv; o.suggested_value = null; o.suggestion_meta = null; continue; }
          if (!changedTarget && !changedSource && nv === b) continue;
          if (!human && !changedTarget && !changedSource && c === b) { put(a,p,nv); o.last_ai_value = nv; o.suggested_value = null; o.suggestion_meta = null; continue; }
          if (o.suggestion_meta && o.suggestion_meta.key !== key) superseded_suggestions.push({annotation_id:a.id,field_path:p,value:o.suggested_value,meta:clone(o.suggestion_meta)});
          o.suggested_value = nv === null ? '' : nv;
          o.suggestion_meta = {key,base_revision:current.base_revision,binding_revision:a.binding_revision,source_refs:clone(n.source_refs),evidence_status:n.evidence_status,implementation_status:n.implementation_status};
          conflicts.push({annotation_id:a.id,field_path:p,key,reason:changedTarget?'target changed':changedSource?'source changed':'human edit'});
        }
        if (!equal(before,a)) a.revision++;
      }
      if (gate.value.generation_valid) out.generation_scope = clone(scope);
      out.provenance.source_revision = proposed.provenance.source_revision;
      if (!equal(current,out)) { out.notes_revision++; out.validation_status = 'unreviewed'; }
      const checked = validateNotes(out,sources); if (!checked.ok) return checked;
      const coverage=gate.value.coverage.map(c=>({...c,states:c.annotation_ids.map(id=>{const a=out.annotations.find(a=>a.id===id);return {evidence_status:a.evidence_status,implementation_status:a.implementation_status};})}));
      return ok({merged:out,conflicts,superseded_suggestions,coverage,assistance_coverage:gate.value.assistance_coverage,request_kind:gate.value.request_kind});
    } catch (error) { return fail('INVALID_NOTES','说明合并未提交，请保留原数据。',[error.message]); }
  }
  // Draft credentials live only in this factory; JSON and exported notes cannot issue or replay them.
  const draftAllocations = new WeakMap();
  // The UI uses this one transaction seam; generation scope is deliberately absent from permission checks.
  async function applyManualTransaction({document,action,annotation_id,field_path,value,changes,annotation,anchor,context,kind,allocation,base_revision,undo_token} = {}, sources) {
    try {
      const valid = validateNotes(document,sources); if (!valid.ok) return valid;
      if (action === 'defer') return ok({document:clone(document),undo_token:null});
      const out = clone(document); let a = out.annotations.find(a => a.id === annotation_id), saved = null, reserved = null, used = null;
      if(action === 'cancel-reservation') {
        const record=allocation && draftAllocations.get(allocation);
        if(!record || !record.active)return fail('SOURCE_CHANGED','这次新建分配已失效。');
        record.active=false;return ok({document:out,undo_token:null});
      }
      if(action === 'reserve') {
        if(typeof annotation_id!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(annotation_id) || a)return fail('INVALID_NOTES','新建说明身份无效。');
        reserved={annotation_id,display_number:out.next_display_number++};
      } else if (action === 'undo') {
        if (!undo_token || undo_token.after_sha256 !== await hash(JSON.stringify(document))) return fail('SOURCE_CHANGED','后续修改已使撤销失效。');
        const prior = undo_token.before_annotation, at = out.annotations.findIndex(a => a.id === prior.id);
        if (at < 0) return fail('SOURCE_CHANGED','撤销对象已改变。');
        out.annotations[at] = clone(prior); out.annotations[at].revision = document.annotations[at].revision + 1;
      } else if (action === 'add') {
        if (!annotation || annotation.creation_origin !== 'manual' || annotation.generation_scope_id !== null || out.annotations.some(a => a.id === annotation.id)) return fail('INVALID_NOTES','新建说明身份无效。');
        a = clone(annotation);
        if(allocation!==undefined) {
          used=allocation && draftAllocations.get(allocation);
          if(!used || !used.active || used.document_id!==out.document_id || used.base_revision!==out.base_revision || used.after_sha256!==await hash(JSON.stringify(document)) || used.annotation_id!==a.id || used.display_number!==a.display_number)return fail('SOURCE_CHANGED','新建分配已改变，请保留输入并重新开始新建。');
          a.display_number=used.display_number;
        } else a.display_number = out.next_display_number++;
        a.revision = 1;
        a.field_origins = Object.fromEntries(paths.filter(p=>get(a,p)!==null).map(p=>[p,{...origin(null),human_touched:true}])); out.annotations.push(a);
      } else if (action === 'rebase') {
        if (!/^[0-9a-f]{64}$/.test(base_revision) || base_revision === out.base_revision) return fail('SOURCE_CHANGED','需要明确的新业务版本。');
        out.base_revision = base_revision; out.generation_scope = null;
        for (const item of out.annotations) { item.binding_revision++; item.revision++; for (const o of Object.values(item.field_origins)) { o.resolved_suggestion_keys = []; o.last_ai_value = null; o.human_touched = true; } if (item.anchor) item.anchor.requires_rebind = true; }
      } else {
        if (!a) return fail('INVALID_NOTES','未找到说明。');
        if (action === 'keep' || action === 'adopt') {
          if (!paths.includes(field_path) || !a.field_origins[field_path]?.suggestion_meta) return fail('INVALID_NOTES','未找到字段更新建议。');
          const o = a.field_origins[field_path], m = o.suggestion_meta;
          if (m.base_revision !== out.base_revision || m.binding_revision !== a.binding_revision) return fail('SOURCE_CHANGED','说明已更新，请重新查看。'); // guard:stale-suggestion
          saved = clone(a);
          if (action === 'adopt') {
            put(a,field_path,o.suggested_value); a.source_refs = sorted([...a.source_refs,...m.source_refs]);
            if (a.evidence_status !== m.evidence_status || m.evidence_status === 'proposed') a.evidence_status = 'proposed';
            // Actual implementation status is observation, never promoted by adopting prose.
          }
          o.last_ai_value = o.suggested_value; o.human_touched = true; o.resolved_suggestion_keys = sorted([...o.resolved_suggestion_keys,m.key]); o.suggested_value = null; o.suggestion_meta = null;
        } else if (action === 'edit') {
          const edits = changes || {[field_path]:value};
          for (const [p,v] of Object.entries(edits)) { if (!paths.includes(p) || (v !== null && typeof v !== 'string')) return fail('INVALID_NOTES','只能编辑说明文字字段。'); put(a,p,v); (a.field_origins[p] ||= origin(null)).human_touched = true; }
          if(kind!==undefined)a.kind=kind;
          const bindingChanged=(context!==undefined && !equal(context,a.page_or_state_context)) || (anchor!==undefined && !equal(anchor,a.anchor));
          if(context!==undefined)a.page_or_state_context=clone(context);
          if(anchor!==undefined)a.anchor=clone(anchor);
          else if(bindingChanged && a.anchor){a.anchor.context_id=a.page_or_state_context.id;a.anchor.requires_rebind=true;}
          if(bindingChanged){a.binding_revision++;for(const o of Object.values(a.field_origins)){o.resolved_suggestion_keys=[];o.last_ai_value=null;o.human_touched=true;}}
        } else if (action === 'delete') a.tombstone = {deleted_revision:a.revision + 1,deleted_by:'manual'};
        else if (action === 'undelete') a.tombstone = null;
        else if (action === 'rebind') {
          a.anchor = clone(anchor); if (context) a.page_or_state_context = clone(context); a.binding_revision++;
          for (const o of Object.values(a.field_origins)) { o.resolved_suggestion_keys = []; o.last_ai_value = null; o.human_touched = true; }
        } else return fail('INVALID_NOTES','不支持的人工操作。');
        a.revision++;
      }
      out.notes_revision++; out.validation_status = 'unreviewed';
      const checked = validateNotes(out,sources); if (!checked.ok) return checked;
      if(used)used.active=false;
      if(reserved)draftAllocations.set(reserved,{...reserved,document_id:out.document_id,base_revision:out.base_revision,after_sha256:await hash(JSON.stringify(out)),active:true});
      return ok({document:out,undo_token:saved ? {before_annotation:saved,after_sha256:await hash(JSON.stringify(out))} : null,...(reserved?{allocation:reserved}:{})});
    } catch (error) { return fail('INVALID_NOTES','修改未提交，当前内容已保留。',[error.message]); }
  }
  async function assemble(bundle) {
    try {
      if (bundle.version !== 1) return fail('UNKNOWN_VERSION', '封装版本不支持。');
      const validation = validateNotes(bundle.notes,bundle.sources); if (!validation.ok) return validation;
      if (typeof bundle.source !== 'string' || bytes(bundle.source).length > 33554432 || await hash(bundle.source) !== bundle.notes.base_revision) return fail('SOURCE_CHANGED', '原型源码与说明版本不一致。');
      if (!Number.isSafeInteger(bundle.offset) || bundle.offset < 0 || bundle.offset > bundle.source.length) return fail('CORRUPT_EMBEDDING', '注入位置无效。');
      if (bundle.runtime.toLowerCase().includes('<' + '/script') || bundle.core.toLowerCase().includes('<' + '/script')) return fail('CORRUPT_EMBEDDING', '运行时包含不安全结束串。');
      const encoded = safeJSON(bundle), envelope = {version:1,length:bytes(encoded).length,sha256:await hash(encoded),bundle};
      const block = '<script id="luca-notes-data" type="application/json">' + safeJSON(envelope) + '<' + '/script>' +
        '<script id="luca-notes-bootstrap">(' + bundle.runtime + ')((' + bundle.core + '),document.getElementById("luca-notes-data"));<' + '/script>';
      const insertions = [{offset:bundle.offset,text:block},...(bundle.insertions || [])];
      if (insertions.some(p => !Number.isSafeInteger(p.offset) || p.offset < bundle.offset || p.offset > bundle.source.length || typeof p.text !== 'string')) return fail('CORRUPT_EMBEDDING','源映射无效。');
      const sortedPatches = insertions.map((p,i)=>({...p,i})).sort((a,b)=>b.offset-a.offset || b.i-a.i);
      let html = bundle.source; for (const p of sortedPatches) html = html.slice(0,p.offset) + p.text + html.slice(p.offset);
      const finalBytes = bytes(html).length;
      if (finalBytes > maxPackageBytes) return fail('EXPORT_FAILED','完整 HTML 超过可重新打开的大小限制，请保留当前内容。',[{final_bytes:finalBytes,max_bytes:maxPackageBytes}]);
      return ok({html,source_sha256:bundle.notes.base_revision,metadata:{input_sha256:bundle.input_sha256 || bundle.notes.base_revision,business_revision:bundle.notes.provenance.business_revision,notes_revision:bundle.notes.notes_revision,source_sha256:bundle.notes.base_revision,transformations:bundle.transformations || [],static_valid:true,source_valid:true,generation_valid:false,delivery_acceptance:'NOT_RUN'}});
    } catch (error) { return fail('EXPORT_FAILED','无法生成完整 HTML，请保留当前页面。',[error.message]); }
  }
  async function extractNotes({html,raw} = {}) {
    try {
      if (typeof html !== 'string' || bytes(html).length > maxPackageBytes) return fail('CORRUPT_EMBEDDING','文件大小或编码不支持。');
      const envelope = parseJSON(raw);
      if (envelope.version !== 1 || envelope.bundle?.version !== 1) return fail('UNKNOWN_VERSION','说明封装版本不支持。');
      if (Object.keys(envelope).sort().join() !== 'bundle,length,sha256,version' || safeJSON(envelope) !== raw) return fail('CORRUPT_EMBEDDING','说明区块编码无效。');
      const b = envelope.bundle, encoded = safeJSON(b);
      if (envelope.length !== bytes(encoded).length || envelope.sha256 !== await hash(encoded)) return fail('CORRUPT_EMBEDDING','说明长度或完整性校验失败。');
      const built = await assemble(b); if (!built.ok) return built;
      if (built.value.html !== html) return fail('CORRUPT_EMBEDDING','文件含业务修改，请保留原件并重新确认业务版本。');
      return ok({notes:clone(b.notes),source:b.source,bundle:b});
    } catch (error) { return fail('CORRUPT_EMBEDDING','无法读取说明封装，请保留原件。',[error.message]); }
  }
  return {maxPackageBytes,fail,ok,clone,safeJSON,hash,parseJSON,validateNotes,validateGenerationScope,mergeNotes,applyManualTransaction,assemble,buildAnnotatedHtml:assemble,extractNotes};
}
