# Examples

Runnable examples for `@unison/sdk`. Set a token first:

```bash
export UNISON_TOKEN="usk_live_..."          # from the dashboard → Settings → API keys
export UNISON_API_URL="https://api.unisonlabs.ai"   # optional; this is the default
```

Then:

```bash
bun examples/basic.ts "your search query"
```

| File | What it shows |
| --- | --- |
| [`basic.ts`](./basic.ts) | Construct the client, search, read a doc, write a note. |
