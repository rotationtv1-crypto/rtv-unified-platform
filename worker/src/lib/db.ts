import type { D1Database } from '@cloudflare/workers-types'

export function getDb(d1: D1Database) {
  return {
    async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
      const stmt = d1.prepare(sql)
      const result = params ? stmt.bind(...params) : stmt
      const { results } = await result.all<T>()
      return results || []
    },

    async queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
      const rows = await this.query<T>(sql, params)
      return rows[0] || null
    },

    async exec(sql: string, params?: unknown[]): Promise<D1Result> {
      const stmt = d1.prepare(sql)
      const result = params ? stmt.bind(...params) : stmt
      return result.run()
    },
  }
}

export type DbClient = ReturnType<typeof getDb>
