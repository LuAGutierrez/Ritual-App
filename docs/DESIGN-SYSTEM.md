# Design System — Rituales

Última actualización: julio 2026

---

## Principio de diseño

Rituales es una app íntima, nocturna, para parejas. El diseño refleja esto:
- Fondo oscuro cálido (no negro puro)
- Tipografía con contraste serif/sans
- Paleta tierra/dorada, sin colores fríos
- Animaciones suaves, nunca abruptas
- Mobile-first, max-width 448px para el contenido principal

---

## Paleta de colores (Tailwind custom)

| Token | Hex | Uso |
|-------|-----|-----|
| `ritual-bg` | `#0F0D0B` | Fondo principal de todas las páginas |
| `ritual-bg-soft` | `#1A1612` | Cards, inputs, fondos secundarios |
| `ritual-gold` | `#C9A97A` | Acciones primarias, acentos, CTA |
| `ritual-cream` | `#E8D5B7` | Texto principal, títulos |
| `ritual-terra` | `#8B6F5E` | Categoría "reto", acentos terciarios |
| `ritual-rose` | `#D4A5A5` | Categoría "intimidad", nombre de pareja |
| `ritual-text` | `#F0EBE3` | Texto secundario ligeramente más claro |
| `ritual-muted` | `#A89880` | Texto de apoyo, labels, metadata |

**Paleta legacy** (wine/nude/ink) — de la versión HTML anterior, sin uso activo en Next.js.

---

## Tipografía

| Clase | Fuente | Uso |
|-------|--------|-----|
| `font-display` | Cormorant Garamond (serif) | Títulos, prompts del ritual, momentos emocionales |
| `font-body` | Outfit (sans-serif) | Todo lo demás: labels, botones, texto |

Las fuentes se cargan desde Google Fonts via `globals.css`.

---

## Animaciones

| Clase | Definición | Uso |
|-------|-----------|-----|
| `animate-fade-in` | opacity 0→1, 0.6s | Apariciones simples (logo en /auth) |
| `animate-fade-up` | opacity+translateY, 0.7s | Pantallas completas al cargar |
| `animate-scale-in` | opacity+scale 0.95→1, 0.5s | Cards que aparecen |
| `animate-reveal` | opacity+translateY+scale, 0.8s cubic | Reveal de respuestas |
| `animate-spin` | rotación continua | Spinner de carga |
| `animate-pulse-soft` | opacity 1→0.6, 2s loop | Estados de espera |

El componente `RevealCards` usa **Framer Motion** para stagger (`.3s` entre cards) con ease `[0.16, 1, 0.3, 1]` (spring-like).

---

## Patrones de componentes

### Botón primario
```jsx
<button className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl
  hover:bg-ritual-cream active:scale-[0.98] transition-all duration-300 disabled:opacity-40">
```

### Botón secundario (fantasma)
```jsx
<button className="w-full bg-transparent border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl
  hover:border-white/20 hover:text-ritual-text transition-all duration-300">
```

### Input de texto
```jsx
<input className="w-full bg-ritual-bg-soft border border-white/10 rounded-xl px-4 py-3.5
  text-ritual-text placeholder-ritual-muted/50 font-body text-sm
  focus:outline-none focus:border-ritual-gold/50 transition-colors">
```

### Card de contenido
```jsx
<div className="bg-ritual-bg-soft border border-white/8 rounded-2xl p-6">
```

### Card de alerta/gold
```jsx
<div className="bg-ritual-gold/8 border border-ritual-gold/20 rounded-2xl p-4">
```

### Error inline
```jsx
<p className="text-red-400/80 text-sm font-body text-center py-1">
```

---

## Layout

- Todas las páginas: `min-h-dvh bg-ritual-bg flex flex-col`
- Contenido principal: `max-w-md mx-auto w-full px-5`
- Header: `px-5 pt-8 pb-4 flex items-center justify-between`

`dvh` (dynamic viewport height) en lugar de `vh` para que funcione correctamente con la barra de dirección del navegador móvil.

---

## Categorías de rituales — colores

| Categoría | Color texto | Badge |
|-----------|------------|-------|
| `conexion` | `text-ritual-gold` | `bg-ritual-gold/10 border-ritual-gold/30` |
| `diversion` | `text-ritual-cream` | `bg-ritual-cream/10 border-ritual-cream/30` |
| `intimidad` | `text-[#D4A5A5]` | `bg-[#D4A5A5]/10 border-[#D4A5A5]/30` |
| `reto` | `text-[#8B6F5E]` | `bg-[#8B6F5E]/10 border-[#8B6F5E]/40` |

---

## Modo oscuro

El HTML root tiene `class="dark"`. Toda la paleta es oscura por defecto. No hay modo claro implementado ni planeado.
