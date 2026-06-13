# Examples

Runnable examples for `@unisonlabs/sdk`. Set a token first:

```bash
# Get a key via the CLI (email-OTP, no browser):
unison auth login              # prompts for email; stores key at ~/.config/unison/config.json
# — or mint one for CI/scripts:
unison auth keys create --name examples
# Then:
export UNISON_TOKEN="usk_live_..."
export UNISON_API_URL="https://brain.unisonlabs.ai"   # optional; this is the default
```

Then:

```bash
bun examples/basic.ts "your search query"
```

| File | What it shows |
| --- | --- |
| [`basic.ts`](./basic.ts) | Construct the client, search, read a doc, write + edit a note, check status. |
| [`entities.ts`](./entities.ts) | Resolve an entity, read its facts, record a new fact, view its timeline. |
