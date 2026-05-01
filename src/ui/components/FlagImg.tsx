import { NATIONALITY_BY_ID } from '../../data/player-nationalities'

const FLAGCDN_CODE: Record<string, string> = {
  EN: 'gb-eng',
}

interface Props {
  cardId?: string
  code?: string
  size?: number
  className?: string
}

export function FlagImg({ cardId, code, size = 14, className = '' }: Props) {
  const resolved = code ?? (cardId ? NATIONALITY_BY_ID[cardId] : undefined)
  if (!resolved) return null
  const flag = (FLAGCDN_CODE[resolved] ?? resolved.toLowerCase())
  const displayWidth = Math.round(size * 1.4)
  return (
    <img
      src={`https://flagcdn.com/w40/${flag}.png`}
      alt={resolved}
      title={resolved}
      width={displayWidth}
      height={size}
      loading="lazy"
      className={`inline-block rounded-sm align-text-bottom ${className}`}
      style={{ verticalAlign: '-2px', objectFit: 'cover' }}
    />
  )
}
