import type { Env } from '../types'

export async function query<T>(db: D1Database, sql: string, params?: unknown[]): Promise<T[]> {
  const stmt = db.prepare(sql)
  const result = params ? await stmt.bind(...params).all() : await stmt.all()
  return (result.results as T[]) || []
}

export async function queryOne<T>(db: D1Database, sql: string, params?: unknown[]): Promise<T | null> {
  const results = await query<T>(db, sql, params)
  return results[0] || null
}

export async function exec(db: D1Database, sql: string, params?: unknown[]): Promise<D1Result> {
  const stmt = db.prepare(sql)
  return params ? await stmt.bind(...params).run() : await stmt.run()
}
