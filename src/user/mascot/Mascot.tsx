import done from './done.webp'
import fail from './fail.webp'
import idle from './idle.webp'
import thinking from './thinking.webp'
import './mascot.css'

export type MascotState = 'idle' | 'thinking' | 'done' | 'fail'

const POSES: Record<MascotState, string> = { idle, thinking, done, fail }

interface MascotProps {
  state?: MascotState
  size?: number
  className?: string
}

export function Mascot({ state = 'idle', size = 32, className = '' }: MascotProps) {
  return (
    <span
      className={`ubot-mascot ubot-mascot--${state} ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {(Object.keys(POSES) as MascotState[]).map((pose) => (
        <img
          key={pose}
          src={POSES[pose]}
          alt=""
          draggable={false}
          className={pose === state ? 'is-active' : undefined}
        />
      ))}
    </span>
  )
}
