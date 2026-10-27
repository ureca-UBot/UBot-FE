import { Link } from 'react-router-dom'
import { productCatalogKinds } from '../product/catalog'

export function HeaderMegaMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className="mega-menu header-mega-menu" id="header-menu-all" hidden={!open}>
      <div className="mega-menu-inner mega-menu-grid">
        <section className="mega-column" aria-label="AI 채팅">
          <strong>AI 채팅</strong>
          <Link to="/ai" onClick={onClose}>
            Ubot 채팅
          </Link>
        </section>
        <section className="mega-column" aria-label="매장 정보">
          <strong>매장 정보</strong>
          <Link to="/stores" onClick={onClose}>
            매장 찾기
          </Link>
        </section>
        <section className="mega-column" aria-label="상품 정보">
          <strong>상품 정보</strong>
          {productCatalogKinds.map((kind) => (
            <Link key={kind.key} to={`/store?category=${kind.key}`} onClick={onClose}>
              {kind.label}
            </Link>
          ))}
        </section>
        <section className="mega-column" aria-label="공지/장애 안내">
          <strong>공지/장애 안내</strong>
          <Link to="/notices" onClick={onClose}>
            공지 · 장애 안내
          </Link>
        </section>
        <section className="mega-column" aria-label="고객센터">
          <strong>고객센터</strong>
          <Link to="/customer-center?section=inquiry" onClick={onClose}>
            문의
          </Link>
          <Link to="/ai?focus=counsel" onClick={onClose}>
            상담사 연결
          </Link>
          <Link to="/ai" onClick={onClose}>
            AI 챗봇
          </Link>
          <Link to="/customer-center?section=faq" onClick={onClose}>
            FAQ
          </Link>
        </section>
      </div>
    </div>
  )
}
