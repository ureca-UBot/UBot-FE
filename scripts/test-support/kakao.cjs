// 외부 지도 요청 없이 지도 생성·마커 전달·선택 동작을 확인하는 브라우저 SDK 대역입니다.
async function installKakaoFixture(context) {
  await context.addInitScript(() => {
    window.__markerImages = []
    class LatLng {
      constructor(lat, lng) {
        this.lat = lat
        this.lng = lng
      }
      getLat() {
        return this.lat
      }
      getLng() {
        return this.lng
      }
    }
    class Bounds {
      constructor() {
        this.positions = []
      }
      extend(position) {
        this.positions.push(position)
      }
      getSouthWest() {
        return new LatLng(37.48, 126.98)
      }
      getNorthEast() {
        return new LatLng(37.52, 127.02)
      }
    }
    class Map {
      constructor(element, options) {
        this.element = element
        this.center = options.center
        this.level = options.level
        element.dataset.mapReady = 'true'
      }
      getCenter() {
        return this.center
      }
      setCenter(value) {
        this.center = value
      }
      panTo(value) {
        this.center = value
      }
      panBy() {}
      getLevel() {
        return this.level
      }
      setLevel(value) {
        this.level = value
      }
      setMaxLevel() {}
      setMinLevel() {}
      addControl() {}
      getBounds() {
        return new Bounds()
      }
      setBounds(bounds) {
        if (bounds.positions[0]) this.center = bounds.positions[0]
      }
      relayout() {}
      getProjection() {
        return {
          containerPointFromCoords: () => ({
            x: this.element.clientWidth / 2,
            y: this.element.clientHeight / 2,
          }),
        }
      }
    }
    class MarkerImage {
      constructor(source, size, options) {
        this.source = source
        this.size = size
        this.options = options
        window.__markerImages.push(source)
      }
    }
    class Marker {
      constructor(options) {
        this.options = options
        this.node = document.createElement('img')
        this.node.alt = options.title || ''
        if (options.image) this.node.src = options.image.source
        this.node.style = 'position:absolute;left:50%;top:50%;width:34px;height:48px'
        if (options.map) this.setMap(options.map)
      }
      setMap(map) {
        this.node.remove()
        if (map) map.element.appendChild(this.node)
      }
      getPosition() {
        return this.options.position
      }
    }
    class Overlay {
      constructor(options) {
        this.content = options.content
      }
      setMap(map) {
        if (this.content instanceof HTMLElement) {
          this.content.remove()
          if (map) map.element.appendChild(this.content)
        }
      }
      setPosition() {}
      setContent(content) {
        this.content = content
      }
      setZIndex() {}
    }
    class Geocoder {
      addressSearch(value, callback) {
        callback([], 'ZERO_RESULT')
      }
      coord2Address(a, b, callback) {
        callback([], 'ZERO_RESULT')
      }
    }
    class Places {
      keywordSearch(value, callback) {
        callback([], 'ZERO_RESULT')
      }
    }
    window.kakao = {
      maps: {
        load: (callback) => callback(),
        LatLng,
        LatLngBounds: Bounds,
        Map,
        Marker,
        MarkerImage,
        Size: class {
          constructor(width, height) {
            this.width = width
            this.height = height
          }
        },
        Point: class {
          constructor(x, y) {
            this.x = x
            this.y = y
          }
        },
        CustomOverlay: Overlay,
        InfoWindow: class {
          close() {}
        },
        Polyline: class {
          setMap() {}
          setPath() {}
        },
        ZoomControl: class {},
        ControlPosition: { RIGHT: 'right' },
        event: { addListener() {}, removeListener() {} },
        services: { Geocoder, Places, Status: { OK: 'OK' } },
      },
    }
  })
}

async function installGeolocationFixture(context) {
  await context.addInitScript(() => {
    window.__geoCalls = 0
    window.__geoRequests = []
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success, error) {
          window.__geoCalls += 1
          window.__geoRequests.push({ success, error })
        },
      },
    })
  })
}
module.exports = { installKakaoFixture, installGeolocationFixture }
