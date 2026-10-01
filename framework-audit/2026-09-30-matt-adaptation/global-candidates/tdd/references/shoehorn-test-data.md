# Shoehorn test-data recipe

Test code only. Never migrate production `as` assertions or turn intentional error input into valid
data. Bind actual approved test-file/case scope, original U-ID, confirmed public seam and manager
from real packageManager/lockfiles. Read current assertions and expected error before touching data.
An absent @total-typescript/shoehorn dependency or file permission means proposal/NEEDS_CONTEXT;
installation needs its own approval and actual manager, not implicit npm/npx or dependency download.

## Classify each fixture before changing it

- Large valid object where the test needs a few properties, or test `as Type` → `fromPartial`.
  Remove unnecessary invented fields; expected behavior/assertion remains unchanged.
- Intentional `as unknown as Type` (wrong id type, malformed input) → `fromAny`. Keep the wrong
  value and the existing rejection/error assertion. It preserves autocomplete without pretending
  invalid input is valid; do not use fromPartial to erase the error case.
- `fromExact` deliberately requires a full shape; use when that full object is the test's intent,
  not as a blanket replacement. It can later be changed to fromPartial when partial data is intended.

```ts
import { fromPartial, fromAny, fromExact } from "@total-typescript/shoehorn";
// Before: getUser({ body: { id: "123" } } as Request)
getUser(fromPartial({ body: { id: "123" } }));
// Before: getUser({ body: { id: 123 } } as unknown as Request)
getUser(fromAny({ body: { id: 123 } })); // intentionally wrong; keep the rejection test
// Full-object intent (provide the real Request fields): fromExact<Request>(completeFixture)
```

## Workflow and verification

1. Ask only unresolved requirements: exact test files, large partial objects and deliberate invalid
   cases. Enumerate actual casts inside those files; no repository-wide production replacement.
2. With the already approved dependency present, migrate one test fixture at a time, add only
   needed imports and preserve assertions, edge cases and user changes. Keep runner vocabulary
   and existing test structure. This recipe does not replace the TDD public-seam agreement.
3. Run the actual project's typecheck and the original target test files, capture output/exit and
   compare original observable assertions. Grep showing no `as` is insufficient. Missing runner,
   dependency or runtime leaves NOT_RUN/UNKNOWN, not green. Do not install silently to finish.
4. Return only test-path diff, fromPartial/fromAny/fromExact rationale, manager/dependency evidence,
   real typecheck/test results and gaps. No auto commit, production edits or extra tracker effect.

Source29 migrate-to-shoehorn, Matt Pocock, MIT, pin
`d81f3a183412e71a5b1e84ca21bc1a35eea03a60`.
<!-- FILE_END: tdd/references/shoehorn-test-data.md -->
