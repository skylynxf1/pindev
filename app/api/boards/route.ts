import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

const createBoardSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Board name is required')
    .max(80, 'Board name must be 80 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer')
    .optional()
    .default(''),
  is_private: z
    .union([z.boolean(), z.string()])
    .transform((val) =>
      typeof val === 'string' ? val === 'true' : val
    )
    .default(false),
})

// ── GET /api/boards  — list current user's boards ─────────────────────────────
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return errorResponse('Unauthorized', 401)

  const { data, error } = await supabase
    .from('boards')
    .select('id, name, description, is_private, created_at, updated_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return errorResponse('Failed to load boards.', 500)

  return NextResponse.json({ boards: data ?? [] })
}

// ── POST /api/boards  — create a board ────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return errorResponse('Unauthorized', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const parsed = createBoardSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return errorResponse(first?.message ?? 'Invalid input')
  }

  const { name, description, is_private } = parsed.data

  const { data: board, error: insertError } = await supabase
    .from('boards')
    .insert({ owner_id: user.id, name, description, is_private })
    .select('id, name, description, is_private, created_at, updated_at')
    .single()

  if (insertError || !board) {
    return errorResponse('Failed to create board.', 500)
  }

  return NextResponse.json({ board }, { status: 201 })
}