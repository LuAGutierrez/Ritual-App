'use server'

import { createClient } from '@/lib/supabase/server'
import { siguienteTurno } from '@/lib/turnos'
import { dentroDelTecho, type Intensidad } from '@/lib/intensidad'
import type { ConocesRound, ConocesStats, UserContext } from '@/types'

export async function getConocesPageDataAction(): Promise<{
  context: UserContext
  round: ConocesRound | null
  stats: ConocesStats | null
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_conoces_page_data')

  if (error || !data) return null

  return data as { context: UserContext; round: ConocesRound | null; stats: ConocesStats | null }
}

// Probabilidad del evento especial "Cambio de Roles": en vez de
// alternar como siempre, el mismo que fue sujeto la última vez vuelve
// a serlo esta ronda. Baja a propósito -- si pasara seguido, dejaría
// de sentirse como una sorpresa y empezaría a sentirse injusto.
const PROBABILIDAD_CAMBIO_DE_ROLES = 0.2

// Elige un item al azar (evitando repetir preguntas vistas en la sesión,
// igual que startEleccionRoundAction) y decide subject_user_id con
// siguienteTurno() -- robusto a rondas abandonadas sin reveal, porque
// mira el actor real de la última ronda, no un conteo.
export async function startConocesRoundAction(
  coupleId: string,
  excluir: string[] = [],
  categoriaPreferida: string | null = null
): Promise<ConocesRound | null> {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('conoces_items')
    .select('pregunta, opciones, intensidad, categoria')
    .eq('picante', false)

  if (!items || items.length === 0) return null

  const { data: couple } = await supabase
    .from('couples')
    .select('intensidad_maxima')
    .eq('id', coupleId)
    .single()
  const techo = (couple?.intensidad_maxima as Intensidad) ?? 'intensa'
  const dentroDeTecho = items.filter(i => dentroDelTecho(i.intensidad as Intensidad, techo))
  const porTecho = dentroDeTecho.length >= 3 ? dentroDeTecho : items

  const disponibles = porTecho.filter(i => !excluir.includes(i.pregunta))
  const porRechazo = disponibles.length > 0 ? disponibles : porTecho

  let pool = porRechazo
  const { data: ultimaRonda } = await supabase
    .from('couple_conoces_rounds')
    .select('pregunta')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (ultimaRonda) {
    const ultimaCategoria = items.find(i => i.pregunta === ultimaRonda.pregunta)?.categoria
    if (ultimaCategoria) {
      const variados = porRechazo.filter(i => i.categoria !== ultimaCategoria)
      if (variados.length >= 3) pool = variados
    }
  }

  if (categoriaPreferida) {
    const preferidos = pool.filter(i => i.categoria === categoriaPreferida)
    if (preferidos.length >= 3) pool = preferidos
  }

  const item = pool[Math.floor(Math.random() * pool.length)]

  const cambioDeRoles = Math.random() < PROBABILIDAD_CAMBIO_DE_ROLES
  const turno = await siguienteTurno(supabase, coupleId, 'couple_conoces_rounds', 'subject_user_id', cambioDeRoles)
  if (!turno) return null
  const { user1, user2, actorId: subjectUserId } = turno

  const { data, error } = await supabase
    .from('couple_conoces_rounds')
    .insert({
      couple_id: coupleId,
      user1_id: user1,
      user2_id: user2,
      subject_user_id: subjectUserId,
      pregunta: item.pregunta,
      opciones: item.opciones,
    })
    .select('*')
    .single()

  // couple_conoces_rounds_one_active (migración 047): mismo caso que
  // Elección -- la pareja ya tenía una ronda sin revelar.
  if (error?.code === '23505') {
    const { data: existente } = await supabase
      .from('couple_conoces_rounds')
      .select('*')
      .eq('couple_id', coupleId)
      .is('revealed_at', null)
      .single()
    return existente as ConocesRound | null
  }

  return data as ConocesRound | null
}

export async function submitConocesSubjectChoiceAction(
  roundId: string,
  choice: number
): Promise<ConocesRound | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_conoces_subject_choice', {
    p_round_id: roundId,
    p_choice: choice,
  })
  if (error || !data?.ok) return null
  return data.round as ConocesRound
}

export async function submitConocesGuessAction(
  roundId: string,
  choice: number
): Promise<ConocesRound | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_conoces_guess', {
    p_round_id: roundId,
    p_choice: choice,
  })
  if (error || !data?.ok) return null
  return data.round as ConocesRound
}
