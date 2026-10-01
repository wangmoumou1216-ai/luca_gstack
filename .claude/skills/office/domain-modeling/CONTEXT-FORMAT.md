# Authorized domain glossary format

The filename is a local reference name, not authority to rename or rewrite root CONTEXT.md.
The caller binds the real owner: existing authorized vocabulary takes precedence; otherwise an
explicitly approved verified project's `docs/domain/glossary.md` is the local fallback. NO_PIN
requires an exact framework artifact, never a downstream or root-context guess.

```md
# {Context Name}

{One or two sentences: what this context is and why it exists.}

## Language

**Customer**:
A person or organization purchasing this context's product.
_Avoid_: Client, buyer, account

**User**:
A person with a login identity in this context.
_Avoid_: Customer, account

## Relationships and boundaries

{Only accepted domain ownership and relationship rules.}
```

Pick one canonical term for a concept; list avoided aliases. Definitions are one or two sentences
describing what the concept IS. Include context-specific concepts only; general programming facts,
configuration, code, implementation decisions and acceptance specs have other owners. Group natural
clusters when useful. A proposed name is not canonical until the user accepts it.

Single context: one existing owner. Multiple contexts: follow the already authorized map to context
glossaries and relationships; preserve distinct meanings and owners, asking where the topic belongs
when unclear. Do not introduce GLOSSARY-MAP/CONTEXT-MAP or default layout as setup. Lazily write a
new exact artifact only after accepted language and path authorization. Re-read before each surgical
update, preserve unrelated terms and stable IDs, and update the sustained glossary in place rather
than creating dated copies. Missing files alone never grant creation authority.

Adapted from source05 GLOSSARY-FORMAT and source12 domain consumer contract, current pinned source
commit in SKILL.md. This reference defines glossary content, not governed memory promotion.

<!-- FILE_END: domain-modeling/CONTEXT-FORMAT.md -->
