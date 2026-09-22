import { useEffect } from 'react';
import { setupStoreLocator } from '../store-locator/setupStoreLocator';

interface PageProps {
  active: boolean;
}

export function StoreLocatorPage({ active }: PageProps) {
  useEffect(() => setupStoreLocator(), []);

  return (
    <>
    <section className={`route page-standard${active ? ' active' : ''}`} data-page="stores">
      <div className="standard-hero store-hero"><span>매장 찾기</span><h1>가까운 곳에서<br />필요한 상담을 바로.</h1><p>현재 위치를 기준으로 가까운 대리점을 안내합니다.</p></div>
      <div className="standard-wrap">
        <section className="store-filter-panel" aria-label="매장 검색 조건">
          <div className="store-filter-head">
            <div><span>STORE FINDER</span><h2>원하는 매장을 찾아보세요</h2></div>
            <p>주소·매장명 검색과 지역별 조건 검색을 함께 사용할 수 있어요.</p>
          </div>
          <div className="store-search-large"><span className="store-search-icon" aria-hidden="true">⌕</span><input id="storeSearchInput" defaultValue="서울 강남구 역삼동" placeholder="주소 또는 매장명을 입력해 주세요" aria-label="매장 검색 지역" /><button id="storeCurrentLocation" className="store-location-button" type="button">내 위치</button><button id="storeSearchButton" type="button">검색</button></div>
          <div className="store-region-search" aria-label="지역별 매장 검색">
            <label><span>시/도</span><select id="storeSido" aria-label="시도 선택">
              <option value="">전체 시/도</option>
            </select></label>
            <label><span>시/군/구</span><select id="storeSigungu" aria-label="시군구 선택" disabled>
              <option value="">전체 시/군/구</option>
            </select></label>
            <fieldset className="store-service-filter">
              <legend>제공 서비스 <small>복수 선택 가능</small></legend>
              <button className="store-service-toggle" id="storeServiceToggle" type="button" aria-expanded="false" aria-controls="storeServicePanel">
                <span id="storeServiceSummary">전체 서비스</span><i aria-hidden="true">⌄</i>
              </button>
              <div className="store-service-options" id="storeServicePanel" hidden>
                <label><input type="checkbox" name="storeServiceType" defaultValue="IDENTITY_THEFT_REPORT" /><span>명의도용 접수</span></label>
                <label><input type="checkbox" name="storeServiceType" defaultValue="APPLE_AS" /><span>애플 A/S</span></label>
                <label><input type="checkbox" name="storeServiceType" defaultValue="FOREIGN_LANGUAGE_SUPPORT" /><span>외국어 지원</span></label>
              </div>
            </fieldset>
            <button id="storeRegionSearchButton" type="button">조건으로 찾기</button>
          </div>
          <div className="store-help-strip"><span><b>TIP</b> 지도를 움직인 뒤 ‘이 지역 검색’을 누르면 현재 영역의 매장을 보여드려요.</span><span>지역이나 서비스 조건을 선택하면 결과를 더 빠르게 좁힐 수 있습니다.</span></div>
        </section>
        <div className="store-result-bar">
          <div><b>검색 결과</b><span id="storeResultCount"></span></div>
          <p className="store-search-status" id="storeSearchStatus" aria-live="polite">매장 데이터를 불러오는 중입니다.</p>
        </div>
        <div className="stores-grid">
          <div className="store-map-card">
            <div className="store-map-head"><div><span className="store-live-dot"></span><b>현재 지도 영역</b></div><small>이동 후 버튼을 눌러 다시 검색하세요</small></div>
            <div className="store-map-shell">
              <div className="stores-map" id="storeKakaoMap"><div className="stores-map-placeholder">카카오 지도를 준비하고 있습니다.</div></div>
              <button className="store-viewport-search" id="storeViewportSearch" type="button" hidden>이 지역 검색</button>
            </div>
          </div>
          <aside className="stores-list">
            <div className="stores-list-head"><div><span>NEARBY STORE</span><h3>가까운 대리점</h3></div><small>매장을 선택하면 지도에서 위치를 확인할 수 있어요.</small></div>
            <div id="storeListItems" className="store-list-items"></div>
            <div className="store-list-footer">
              <div className="store-pagination" id="storePagination" hidden>
                <button id="storePrevPage" type="button">이전</button>
                <span id="storePageInfo">1 / 1</span>
                <button id="storeNextPage" type="button">다음</button>
              </div>
              <span>방문 전에 영업시간과 전화번호를 확인해 주세요.</span>
              <button className="reserve-main">선택한 매장 방문 예약</button>
            </div>
          </aside>
        </div>
      </div>
    </section>

    {/*AI*/}
    </>
  );
}
