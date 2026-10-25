// 문장 사이의 공백에서만 나누므로 0.4Mbps 같은 소수점이나 상품명은 보존됩니다.
export function productDescriptionItems(description: string | null): string[] {
  if (!description) return []
  return description
    .split(/\r?\n|[•●]|(?<=[.!?])\s+/u)
    .map((item) => item.replace(/^\s*[-–]\s+/, '').trim())
    .filter(Boolean)
}
