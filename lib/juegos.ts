import type { ComponentType } from 'react'
import { IconEleccion, IconDado, IconBifurcacion, IconOjo, IconBalanza, IconLlama, IconDados } from '@/components/icons/juegos'

// Registro de juegos del hub /juegos. Agregar un juego nuevo es agregar
// una entrada acá, no tocar JSX a mano en app/juegos/page.tsx -- la
// página solo sabe renderizar 3 variantes de layout (destacado,
// compacto, especial), no juegos puntuales.
export type JuegoVariante = 'destacado' | 'compacto' | 'especial'
export type JuegoModo = 'normal' | 'picante'

export interface JuegoBadge {
  texto: string
  conLlama?: boolean
}

export interface JuegoDef {
  id: string
  href: string
  titulo: string
  descripcion: string
  Icono: ComponentType
  variante: JuegoVariante
  badge?: JuegoBadge
  // En qué tab(s) de /juegos aparece. Los juegos con ambos ('normal' y
  // 'picante') salen en las dos tabs -- adentro siguen teniendo su
  // propio toggle de intensidad, esto solo decide en qué tab entran.
  modos: JuegoModo[]
}

export const JUEGOS: JuegoDef[] = [
  {
    id: 'eleccion',
    href: '/juegos/eleccion',
    titulo: 'Elección',
    descripcion: 'Elijan en secreto, en tiempo real. Si coinciden, se llevan un premio.',
    Icono: IconEleccion,
    variante: 'destacado',
    badge: { texto: 'también picante', conLlama: true },
    modos: ['normal', 'picante'],
  },
  {
    id: 'conoces',
    href: '/juegos/conoces',
    titulo: '¿Cuánto me conoces?',
    descripcion: 'Uno responde sobre sí mismo, el otro adivina en secreto. Se turnan solos, ronda a ronda.',
    Icono: IconOjo,
    variante: 'destacado',
    badge: { texto: 'Nosotros' },
    modos: ['normal'],
  },
  {
    id: 'quien-de-los-dos',
    href: '/juegos/quien-de-los-dos',
    titulo: '¿Quién de los dos?',
    descripcion: 'Preguntas comparativas sobre la pareja. Elijan en secreto y vean si piensan igual.',
    Icono: IconBalanza,
    variante: 'destacado',
    badge: { texto: 'Nosotros' },
    modos: ['normal'],
  },
  {
    id: 'verdad-o-reto',
    href: '/juegos/verdad-o-reto',
    titulo: 'Verdad o Reto',
    descripcion: '',
    Icono: IconDado,
    variante: 'compacto',
    badge: { texto: 'también picante', conLlama: true },
    modos: ['normal', 'picante'],
  },
  {
    id: 'esto-o-aquello',
    href: '/juegos/esto-o-aquello',
    titulo: 'Esto o Aquello',
    descripcion: '',
    Icono: IconBifurcacion,
    variante: 'compacto',
    badge: { texto: 'también picante', conLlama: true },
    modos: ['normal', 'picante'],
  },
  {
    id: 'ruleta-picante',
    href: '/juegos/ruleta-picante',
    titulo: 'Ruleta Picante',
    descripcion: 'Solo para parejas que se animan',
    Icono: IconLlama,
    variante: 'especial',
    badge: { texto: '+18' },
    modos: ['picante'],
  },
  {
    id: 'dado-picante',
    href: '/juegos/dado-picante',
    titulo: 'Dado Picante',
    descripcion: 'Tiren los dados: lugar y posición',
    Icono: IconDados,
    variante: 'especial',
    badge: { texto: '+18' },
    modos: ['picante'],
  },
]
