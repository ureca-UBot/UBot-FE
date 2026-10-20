// 매장 찾기 화면은 매장 찾기 페이지와 채팅 지도 드로어 두 곳에 동시에 그려진다.
// 같은 id가 문서에 두 번 생기지 않도록 각 화면의 id 앞에 접두사를 붙이고, 요소도 그 화면 안에서만 찾는다.
export interface LocatorScope {
  root: ParentNode
  idPrefix: string
}

export function locatorQuery(scope: LocatorScope) {
  return <T extends Element = HTMLElement>(id: string) =>
    scope.root.querySelector<T>(`#${scope.idPrefix}${id}`)
}
