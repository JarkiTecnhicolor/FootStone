export interface RelRect {
  x: number
  y: number
  width: number
  height: number
}

export function getCardRect(
  container: HTMLElement | null,
  cardId: string | undefined,
): RelRect | null {
  if (!container || !cardId) return null
  const el = container.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`) as HTMLElement | null
  if (!el) return null
  const c = container.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return {
    x: r.left - c.left,
    y: r.top - c.top,
    width: r.width,
    height: r.height,
  }
}

export function rectCenter(r: RelRect): { x: number; y: number } {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}
