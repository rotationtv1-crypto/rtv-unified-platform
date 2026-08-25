/**
 * Backwards-compatible facade over `../telegram/initData`.
 *
 * REWRITE: the previous implementation imported `createHmac` from `node:crypto`,
 * which does not exist on Cloudflare Workers. This module now performs all
 * cryptography through the Web Crypto implementation in
 * `../telegram/initData` — pure Web Crypto, fully async, no `Buffer`.
 *
 * Prefer importing from `../telegram/initData` directly in new code; these
 * re-exports exist so existing call sites keep working (note the validator
 * is now async and returns a structured result instead of a boolean).
 */

export {
  validateTelegramInitData,
  parseTelegramUser,
  resolveMaxAgeSeconds,
  timingSafeEqual,
  DEFAULT_INITDATA_MAX_AGE_SECONDS,
} from '../telegram/initData'

export type {
  InitDataValidationResult,
  TelegramUser,
  ValidateInitDataOptions,
} from '../telegram/initData'
