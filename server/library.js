import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { readSupabaseConfig } from '../src/lib/supabaseConfig.js'

const mutationSchema = z
  .object({
    action: z.enum(['insert', 'delete']),
    movie: z
      .object({
        id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
        title: z.string().trim().min(1).max(500),
        poster_path: z
          .string()
          .max(500)
          .regex(/^\/[\w./-]+$/)
          .nullable(),
      })
      .strict(),
    kind: z.enum(['liked', 'watchlist']),
  })
  .strict()

export function createLibraryHandler({
  config = readSupabaseConfig(process.env),
  clientFactory = createClient,
} = {}) {
  return async function POST(request) {
    const json = (status, body) =>
      Response.json(body, {
        status,
        headers: { 'Cache-Control': 'no-store' },
      })
    const authorization = request.headers.get('authorization') || ''
    if (!/^Bearer \S+$/.test(authorization))
      return json(401, { error: 'กรุณาเข้าสู่ระบบก่อน' })
    if (!config) return json(503, { error: 'ยังไม่ได้ตั้งค่า Supabase' })
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return json(415, { error: 'ต้องส่งข้อมูลแบบ JSON' })
    try {
      const text = await request.text()
      if (text.length > 4096)
        return json(413, { error: 'ข้อมูลมีขนาดใหญ่เกินไป' })
      let input
      try {
        input = mutationSchema.safeParse(JSON.parse(text))
      } catch {
        return json(400, { error: 'ข้อมูล JSON ไม่ถูกต้อง' })
      }
      if (!input.success)
        return json(400, { error: 'ข้อมูลหนังหรือประเภทไม่ถูกต้อง' })
      // Per-request client uses the caller's token; RLS still applies. No service-role key.
      const client = clientFactory(config.url, config.anonKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data, error: authError } = await client.auth.getUser(
        authorization.slice(7),
      )
      if (authError || !data?.user)
        return json(401, { error: 'กรุณาเข้าสู่ระบบใหม่' })
      const { action, movie, kind } = input.data
      const identity = { user_id: data.user.id, tmdb_movie_id: movie.id, kind }
      const table = client.from('library_items')
      const { error } =
        action === 'insert'
          ? await table.upsert(
              {
                ...identity,
                title: movie.title,
                poster_path: movie.poster_path,
              },
              {
                onConflict: 'user_id,tmdb_movie_id,kind',
                ignoreDuplicates: true,
              },
            )
          : await table.delete().match(identity)
      if (error)
        return json(502, { error: 'บันทึกห้องสมุดไม่สำเร็จ กรุณาลองใหม่' })
      return json(200, { ok: true })
    } catch {
      return json(502, { error: 'เชื่อมต่อบริการไม่ได้ กรุณาลองใหม่' })
    }
  }
}
