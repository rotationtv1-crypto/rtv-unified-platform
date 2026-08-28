# Vault + SECURITY DEFINER

GitHub remains source of truth. This file documents names only.

## What shipped (`00003_vault_security_definer.sql`)

- `app.vault_allowlist` — names Functions may request
- `app.vault_secret(name)` — returns plaintext for an allowlisted name
- `app.vault_secret_configured(name)` — boolean, no value
- `public.increment_creator_earnings(creator_id, amount)` — used by `webhook-tribute`
- `REVOKE` of `vault.decrypted_secrets` from `anon` / `authenticated`

All functions are `SECURITY DEFINER` with a pinned `search_path`.
`EXECUTE` is granted to `service_role` only.

## Where values live

| Name | Store |
|---|---|
| Tribute HMAC / API key | Dashboard → Vault as `tribute_webhook_secret` **and** Edge Function secret `TRIBUTE_API_KEY` (Function already reads env) |
| Telegram bot token | Function secret `TELEGRAM_BOT_TOKEN`. Optional Vault copy named `telegram_bot_token` |
| Cloudflare / LiveKit / GitHub deploy tokens | GitHub Actions + Wrangler. **Not** Vault |

Production Tribute HTTP remains the Cloudflare Worker / this Function — not `*.kimi.page`, not ECS.

## Apply

```bash
supabase db push
# or run 00003 in the SQL editor
```

Then in Dashboard → Database → Vault create rows whose **name** matches the allowlist. Do not put values in git.

## Call from a Function (service role only)

```ts
const { data, error } = await supabaseAdmin.rpc('vault_secret', { p_name: 'tribute_webhook_secret' })
```

Prefer `Deno.env.get('TRIBUTE_API_KEY')` for HMAC in `webhook-tribute`.
Use the RPC only if a SQL trigger must read the key.

## Checks after apply

```sql
select proname, prosecdef, proconfig
from pg_proc
where proname in ('vault_secret', 'vault_secret_configured', 'increment_creator_earnings');

select has_function_privilege('anon', 'app.vault_secret(text)', 'EXECUTE'); -- must be false
```
