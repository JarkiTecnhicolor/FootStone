import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { Keeper, Rarity } from '../../game/types'
import { fetchWikiPhoto, getCachedWikiPhoto } from '../lib/wiki-photo'
import { REAL_PLAYERS, displayName, surname } from '../../data/player-real-names'
import { FlagImg } from './FlagImg'

interface RaritySkin {
  box: string
  badge: string
  avatarBorder: string
  glow: string
}

const RARITY_SKINS: Record<Rarity, RaritySkin> = {
  bronze: {
    box: 'bg-orange-100 border-orange-800 text-orange-950',
    badge: 'bg-orange-800 text-white',
    avatarBorder: 'border-orange-800',
    glow: '',
  },
  silver: {
    box: 'bg-slate-200 border-slate-500 text-slate-900',
    badge: 'bg-slate-600 text-white',
    avatarBorder: 'border-slate-500',
    glow: '',
  },
  gold: {
    box: 'border-yellow-600 text-yellow-950 bg-gradient-to-br from-yellow-100 via-amber-100 to-yellow-200',
    badge: 'bg-yellow-600 text-white',
    avatarBorder: 'border-yellow-600',
    glow: 'shadow-[0_0_14px_rgba(234,179,8,0.65)]',
  },
  legend: {
    box: 'border-purple-500 text-purple-950 bg-gradient-to-br from-purple-100 via-fuchsia-50 to-purple-100',
    badge: 'bg-purple-600 text-white',
    avatarBorder: 'border-purple-500',
    glow: 'shadow-[0_0_14px_rgba(168,85,247,0.55)]',
  },
}

const FALLBACK_SKIN: RaritySkin = {
  box: 'bg-stone-50 border-stone-400 text-stone-900',
  badge: 'bg-stone-500 text-white',
  avatarBorder: 'border-stone-400',
  glow: '',
}

interface Props {
  keeper: Keeper
  highlighted?: boolean
  onClick?: () => void
  footer?: React.ReactNode
}

function fallbackAvatar(name: string): string {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear&backgroundColor=d9e9ff,a3c8e9`
}

export function KeeperCard({ keeper, highlighted, onClick, footer }: Props) {
  const skin = keeper.rarity ? RARITY_SKINS[keeper.rarity] : FALLBACK_SKIN
  const avatarSize = 44
  const widthClass = 'w-[150px]'

  const realName = REAL_PLAYERS[keeper.id]
  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    if (!realName) return null
    const cached = getCachedWikiPhoto(realName)
    return cached ?? null
  })
  const [photoFailed, setPhotoFailed] = useState(false)

  useEffect(() => {
    if (!realName || photoUrl) return
    let cancelled = false
    fetchWikiPhoto(realName).then(url => {
      if (!cancelled && url) setPhotoUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [realName, photoUrl])

  const useWikiPhoto = !!(photoUrl && !photoFailed)
  const finalSrc = useWikiPhoto ? photoUrl : fallbackAvatar(keeper.name)
  const cursor = onClick ? 'cursor-pointer' : 'cursor-default'

  return (
    <motion.div
      onClick={onClick}
      title={keeper.label || keeper.rarity}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      data-card-id={keeper.id}
      className={`relative ${widthClass} min-h-[170px] rounded-lg border ${skin.box} ${skin.glow} ${cursor} flex h-full flex-col select-none p-2 shadow-sm`}
    >
      {highlighted && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-0.5 rounded-lg"
          animate={{
            boxShadow: [
              '0 0 0 2px rgba(220,38,38,0.95)',
              '0 0 0 6px rgba(220,38,38,0.2)',
              '0 0 0 2px rgba(220,38,38,0.95)',
            ],
          }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div
        className={`absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px] shadow ${skin.badge}`}
      >
        🧤
      </div>

      <div className="flex items-start gap-2">
        <img
          src={finalSrc}
          alt=""
          width={avatarSize}
          height={avatarSize}
          loading="lazy"
          onError={() => setPhotoFailed(true)}
          className={`flex-shrink-0 rounded-md border object-cover ${skin.avatarBorder} bg-white`}
          style={{
            width: avatarSize,
            height: avatarSize,
            objectPosition: useWikiPhoto ? 'center 20%' : 'center',
          }}
        />
        <div className="min-w-0 flex-1">
          <div
            className="truncate font-medium leading-tight text-[12px]"
            title={displayName(keeper.id, keeper.name)}
          >
            {surname(keeper.id, keeper.name)}
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="font-medium text-[13px]">
              {keeper.save} DEF
            </span>
          </div>
          <div className="mt-1">
            <span className={`rounded px-1 text-[9px] font-medium ${skin.badge}`}>GK</span>
          </div>
        </div>
      </div>

      {keeper.label && (
        <div className="mt-1.5 border-t border-current/15 pt-1 leading-tight text-[10px] opacity-85">
          {keeper.label}
        </div>
      )}
      <div
        className={`mt-auto flex flex-col gap-1.5 pt-1.5 ${
          keeper.label ? '' : 'border-t border-current/15'
        }`}
      >
        <div className="flex items-center justify-end">
          <FlagImg cardId={keeper.id} />
        </div>
        {footer && <div>{footer}</div>}
      </div>
    </motion.div>
  )
}
