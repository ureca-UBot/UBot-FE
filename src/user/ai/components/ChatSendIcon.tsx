export function ChatSendIcon({ stop = false }: { stop?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={stop ? undefined : 'chat-send-icon'}
      focusable="false"
      viewBox="0 0 24 24"
      width={22}
      height={22}
    >
      {stop ? (
        <rect x={6} y={6} width={12} height={12} rx={2} fill="currentColor" />
      ) : (
        <path
          d="M20 4 3.5 11.2l7 2.3 2.3 7z"
          transform="translate(-2.5 0) rotate(45 12 12)"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
