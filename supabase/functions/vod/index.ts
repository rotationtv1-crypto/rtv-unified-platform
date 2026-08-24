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
    const genre = url.searchParams.get('genre')
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('search')
    const isOriginal = url.searchParams.get('is_original')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    if (slug) {
      const { data: show, error } = await supabaseClient
        .from('shows')
        .select(`
          *,
          category:categories(id, slug, name, color),
          show_genres(genre:genres(id, slug, name, color))
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (error) throw error

      // Get VOD items for this show
      const { data: episodes } = await supabaseClient
        .from('vod_items')
        .select('*')
        .eq('show_id', show.id)
        .order('season_number', { ascending: true })
        .order('episode_number', { ascending: true })

      // Get related shows
      const { data: related } = await supabaseClient
        .from('shows')
        .select('id, slug, title, poster_url, year, rating, is_original')
        .eq('is_active', true)
        .neq('id', show.id)
        .overlaps('genres', show.genres)
        .limit(4)

      return new Response(
        JSON.stringify({ show, episodes: episodes || [], related: related || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let query = supabaseClient
      .from('shows')
      .select(`
        *,
        category:categories(id, slug, name, color),
        show_genres(genre:genres(id, slug, name, color))
      `)
      .eq('is_active', true)
      .eq('type', 'vod')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (genre) {
      const { data: genreData } = await supabaseClient
        .from('genres')
        .select('id')
        .eq('slug', genre)
        .single()
      if (genreData) {
        query = query.contains('genres', [genreData.id])
      }
    }

    if (category) {
      const { data: catData } = await supabaseClient
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single()
      if (catData) query = query.eq('category_id', catData.id)
    }

    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    if (isOriginal === 'true') query = query.eq('is_original', true)

    const { data, error, count } = await query

    if (error) throw error

    return new Response(
      JSON.stringify({ shows: data, count, limit, offset }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
