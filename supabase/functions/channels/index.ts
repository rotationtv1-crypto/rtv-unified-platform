import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')
    const type = url.searchParams.get('type')
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('search')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    let query = supabaseClient
      .from('channels')
      .select(`
        *,
        category:categories(id, slug, name, color)
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (slug) {
      query = query.eq('slug', slug).single()
      const { data, error } = await query
      if (error) throw error

      // If single channel, fetch current program
      if (data) {
        const now = new Date().toISOString()
        const { data: currentProgram } = await supabaseClient
          .from('programs')
          .select('*')
          .eq('channel_id', data.id)
          .lte('start_time', now)
          .gte('end_time', now)
          .single()

        return new Response(
          JSON.stringify({ channel: data, currentProgram }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (type) query = query.eq('type', type)
    if (category) query = query.eq('category_id', category)
    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query

    if (error) throw error

    return new Response(
      JSON.stringify({ channels: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
