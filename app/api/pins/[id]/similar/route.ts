import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPinById, getSimilarPins } from '@/lib/db/queries'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: pin } = await getPinById(supabase, id)
  const tagNames = pin?.tags?.map((t) => t.name) ?? []
  const { data, error } = await getSimilarPins(supabase, id, tagNames, 12)

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ pins: data ?? [] })
}
