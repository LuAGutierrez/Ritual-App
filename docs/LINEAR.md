# Tutorial Linear — Rituales

Guía paso a paso para crear, mover y completar tareas en Linear, usando el ejemplo real **DES-1**.

- Workspace: [linear.app/lucianogutierrez](https://linear.app/lucianogutierrez)
- Equipo: **Desarrollo**
- Proyectos: **Cliente**, **Aplicacion**, **Admin**
- Ejemplo: [DES-1 — Mejorar mensaje de bienvenida en onboarding](https://linear.app/lucianogutierrez/issue/DES-1)

---

## Estructura (igual que Trello)

| En Trello | En Linear |
|-----------|-----------|
| Board Cliente / Aplicacion / Admin | Proyecto Cliente / Aplicacion / Admin |
| Columnas | Estados del equipo Desarrollo |

**Flujo de estados:**

```
Backlog → To do → In Progress → Functional Validation → Code Review → Production
```

También existen **Canceled** y **Duplicate** (sistema de Linear).

---

## Paso 1 — Crear una tarea nueva

1. Entrá a Linear.
2. Presioná **`C`** (o el botón **+** / Create new issue).
3. Arriba a la izquierda vas a ver algo como **`DES > New issue`**.
   - **DES** = equipo **Desarrollo**. Ya viene elegido solo.
   - **No hace falta elegir Team.** Todo el trabajo de Rituales va en Desarrollo.
4. Completá:
   - **Title:** qué hay que hacer (corto y claro).
   - **Project** (ícono del cubo): `Cliente`, `Aplicacion` o `Admin` ← esto sí elegilo.
   - **Status:** `Backlog` (o `To do` si ya está priorizada).
   - **Assignee:** quién la hace.
   - **Priority:** Urgent / High / Medium / Low.
5. En la descripción, usá esta plantilla:

```markdown
## Qué
Qué hay que hacer.

## Por qué
Por qué importa.

## Criterio de listo
- [ ] Condición 1
- [ ] Condición 2
- [ ] Condición 3
```

6. Guardá con **Create issue**.

> **Nota:** El Team no aparece como un chip abajo (Status / Priority / Project). Está arriba a la izquierda (`DES`). Si alguna vez quisieras cambiarlo, clickeá `DES` ahí. Para Rituales dejalo siempre en **Desarrollo**.

### Ejemplo DES-1

Se creó así:

- Título: `Ejemplo: Mejorar mensaje de bienvenida en onboarding`
- Equipo: **Desarrollo** (automático)
- Proyecto: **Cliente**
- Estado inicial: **Backlog**
- Prioridad: **Medium**
- Descripción con Qué / Por qué / Criterio de listo

---

## Paso 2 — Abrir y completar la tarea

1. Abrí la issue (desde Inbox, My issues, el proyecto, o buscando `DES-1`).
2. En el panel derecho vas a ver:
   - Status
   - Priority
   - Assignee
   - Labels
   - Project
   - Due date
3. Podés editar cualquiera de esos campos con un click.

### Cosas útiles para agregar

| Campo | Para qué |
|-------|----------|
| **Description** | Contexto y checklist |
| **Assignee** | Quién la hace |
| **Priority** | Urgencia |
| **Due date** | Fecha límite |
| **Labels** | Tipo (bug, feature…) si las creás |
| **Comments** | Avances y decisiones |
| **Links / attachments** | PR, Figma, capturas |
| **Sub-issues** | Partir trabajo grande |

### Ejemplo DES-1 — qué se le agregó

- Comentario: plan de trabajo de la semana
- Due date: 15 ago 2026
- Link: Design system Rituales
- Assignee: Luciano Gutierrez

Para comentar: abajo de la issue → escribí → Enter.  
Para adjuntar un link: en la issue, agregá un attachment/link con URL + título.

---

## Paso 3 — Mover la tarea de estado

Las columnas de Trello acá son los **estados**.

### Opción A — Desde la issue

1. Abrí la tarea.
2. Click en el **Status** (sidebar derecha).
3. Elegí el nuevo estado.

### Opción B — Desde el board (como Trello)

1. Projects → abrí **Cliente** (o Aplicacion / Admin).
2. Tab **Issues**.
3. Display options → layout **Board**.
4. Columns agrupadas por **Status**.
5. Arrastrá la tarjeta de una columna a otra.

### Opción C — Teclado

1. Seleccioná o abrí la issue.
2. Presioná **`S`** → elegí el status.

### Ejemplo DES-1 — recorrido hecho

```
Backlog
  → To do
  → In Progress
  → Functional Validation
  → (siguiente: Code Review → Production)
```

---

## Paso 4 — Flujo diario recomendado

1. **Backlog** — ideas / pendientes sin comprometer.
2. **To do** — listo para agarrar esta semana.
3. **In Progress** — lo que estás haciendo ahora (pocas a la vez).
4. **Functional Validation** — validar comportamiento / QA.
5. **Code Review** — PR / revisión de código.
6. **Production** — ya está en prod / cerrado.

---

## Orden de la lista (arriba → abajo)

En **All issues** el orden no viene “de Trello” solo: lo controla **Display options** (ícono de sliders arriba a la derecha).

Hay **dos** órdenes distintos:

### 1. Orden de los grupos (Backlog, To do, In Progress…)

1. Display options → **Grouping: Status**
2. Click en **Group ordering** (flechitas al lado de Status)
3. Arrastrá los estados al orden que quieras, por ejemplo:

```
Backlog
To do
In Progress
Functional Validation
Code Review
Production
Canceled
Duplicate
```

Si activás **Show empty groups**, vas a ver también las columnas vacías y podés ordenarlas todas.

### 2. Orden de las issues dentro de un grupo (DES-1, DES-3…)

Display options → **Ordering**:

| Opción | Qué hace |
|--------|----------|
| **Priority** | Primero las urgentes (no respeta DES-1, DES-2…) |
| **Status** | Por estado |
| **Manual** | Las podés arrastrar a mano |
| **Created** | Por fecha de creación |

Si ves `DES-3` arriba de `DES-1` con la misma prioridad, es porque **Ordering = Priority**, no por ID.

---



1. Sidebar → **Projects**.
2. Abrí **Cliente**, **Aplicacion** o **Admin**.
3. Tab **Issues**.
4. Display → **Board**.
5. Group / Columns → **Status**.

Ahí ves el mismo tablero que en Trello, filtrado a ese proyecto.

Si una columna está vacía, Linear la puede ocultar en “Hidden columns”. Podés mostrarlas desde Display → Show empty columns.

---

## Atajos útiles

| Tecla | Acción |
|-------|--------|
| `C` | Nueva issue |
| `S` | Cambiar status |
| `P` | Cambiar prioridad |
| `A` | Asignar |
| `Cmd/Ctrl + K` | Menú de comandos |
| `/` | Buscar |

---

## Checklist rápida (copiá y usá)

- [ ] Crear issue con `C`
- [ ] Elegir proyecto (Cliente / Aplicacion / Admin)
- [ ] Poner descripción Qué / Por qué / Criterio de listo
- [ ] Asignar persona y prioridad
- [ ] Mover a **To do** cuando esté priorizada
- [ ] Mover a **In Progress** al empezar
- [ ] Comentar avances
- [ ] Agregar link a PR / diseño si aplica
- [ ] Pasar por Functional Validation → Code Review → Production

---

## Links rápidos

- [Workspace](https://linear.app/lucianogutierrez)
- [Proyecto Cliente](https://linear.app/lucianogutierrez/project/cliente-f54347543fc4)
- [Proyecto Aplicacion](https://linear.app/lucianogutierrez/project/aplicacion-1610b0239469)
- [Proyecto Admin](https://linear.app/lucianogutierrez/project/admin-22baabd8bd22)
- [Issue de ejemplo DES-1](https://linear.app/lucianogutierrez/issue/DES-1)
- [Estados del equipo Desarrollo](https://linear.app/lucianogutierrez/settings/teams/DES/statuses)
