/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_STREAM_GATEWAY_URL?: string
  readonly VITE_DEFAULT_STREAM_UID?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_TELEGRAM_BOT_USERNAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: Record<string, unknown>
  platform: string
  version: string
  ready: () => void
  expand: () => void
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp
  }
}
