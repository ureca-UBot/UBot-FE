import logo from '../../assets/ubot-logo.png'

// 상품명 원문은 유지하고 브랜드·서비스 성격·제공량만 시각적으로 구분합니다.
const NAME_PARTS =
  /(Ubot|U봇|피싱가드|키즈가드|디바이스|케어|안심|프리미엄|베이직|플러스|맥스|다이렉트|5G(?![a-z\d])|LTE|\d+(?:\.\d+)?\s*(?:[GM]bps|[KMGT]B|[GM])|무제한|(?<=\s)\d{2,3}(?=\s|$))/giu

function partKind(part: string) {
  if (/^(Ubot|U봇)$/i.test(part)) return 'brand'
  if (/가드$/.test(part)) return 'guard'
  if (/^(케어|안심)$/.test(part)) return 'care'
  if (/^디바이스$/.test(part)) return 'device'
  if (/^(프리미엄|베이직|플러스|맥스|다이렉트)$/.test(part)) return 'tier'
  if (/^(5G|LTE)$/i.test(part)) return 'network'
  if (/^(\d|무제한)/.test(part)) return 'amount'
  return null
}

export function ProductName({ name }: { name: string }) {
  return (
    <span className="product-name">
      {name.split(NAME_PARTS).map((part, index) => {
        const kind = partKind(part)
        return kind ? (
          <span className={`product-name-${kind}`} key={index}>
            {kind === 'brand' ? (
              <>
                <img className="product-name-logo" src={logo} alt="" aria-hidden="true" />
                <span className="sr-only-title">{part}</span>
              </>
            ) : (
              part
            )}
          </span>
        ) : (
          part
        )
      })}
    </span>
  )
}
