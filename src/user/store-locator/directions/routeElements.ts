import type { DirectionsResult } from '../types/directions'
import { formatDistance, formatDuration, formatTransitFare } from './format'
import { createRouteIcon, type RouteIconType } from './icons'
import type { RouteChip } from './routeItems'

export function createChips(chips: RouteChip[]) {
  const wrapper = document.createElement('span')
  wrapper.className = 'direction-chips'
  chips.forEach(({ text, color, solid }) => {
    const chip = document.createElement('span')
    chip.className = solid ? 'direction-chip solid' : 'direction-chip'
    chip.style.setProperty('--chip-color', color)
    chip.textContent = text
    wrapper.appendChild(chip)
  })
  return wrapper
}

export function fillRouteHead(head: HTMLElement, result: DirectionsResult) {
  const time = document.createElement('b')
  time.textContent = formatDuration(result.durationSeconds)
  const meta = document.createElement('span')
  const fare = formatTransitFare(result.transitInfo?.fare ?? null)
  meta.textContent = [
    `환승 ${result.transitInfo?.transfers ?? 0}회`,
    fare ? `요금 ${fare.text}` : '',
    formatDistance(result.distanceMeters),
  ]
    .filter(Boolean)
    .join(' · ')
  head.replaceChildren(time, meta)
}

export function createIconButton(
  icon: RouteIconType,
  ariaLabel: string,
  onClick: () => void,
  disabled = false,
) {
  const button = document.createElement('button')
  button.type = 'button'
  button.appendChild(createRouteIcon({ type: icon }, 'direction-popup-icon'))
  button.setAttribute('aria-label', ariaLabel)
  button.disabled = disabled
  button.addEventListener('click', onClick)
  return button
}
