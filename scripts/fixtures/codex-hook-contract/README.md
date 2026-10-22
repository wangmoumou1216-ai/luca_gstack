# Reviewed native registration history

These are literal Git blobs, fixed independently of the live `.codex/hooks.json`
and the implementation. Tests must not reconstruct them from live registration.

| File | Historical commit | Artifact SHA-256 | Semantic SHA-256 |
|---|---|---|---|
| `native-071.json` | `df79eea55e6ff2e16e301578898deed3346cb54d` | `158fab99b871b57dd28bcf870b302163c188fc61eb9d0c3a827b9035ca9c5542` | `071dcae5ae935ce15318dea12d1deaee3cddec60c74bda6d82ec1c422eb885e4` |
| `native-c6.json` | `49154085c4d46059b6e887134b63eacc35cc4d0b` | `8beee10eaa2f8297cb8ded5aefa9a95e1b29e8ddfb84b4b01e855b68c16c5805` | `c6ef2efa3fcb18e91163f4c2dd25277d8c568ae82c490949d47aeff549601c45` |

The only semantic change is the `PreToolUse[1].matcher` expansion for model-route
followup/send-message aliases. The reviewed transition is scoped by the frozen
R2 plan SHA `351bb15c514a9c64156c1dea60774ac1d9ef3e408a447f5c2bbe516bf55cf13f`.
Recognition does not record user adoption and never grants native trust.
