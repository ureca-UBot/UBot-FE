import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const KAKAO_SCRIPT_ORIGINS = 'dapi.kakao.com *.kakaocdn.net *.daumcdn.net'
const KAKAO_ASSET_ORIGINS = '*.kakaocdn.net *.daumcdn.net *.kakao.com'

function contentSecurityPolicy(apiBaseUrl: string | undefined): Plugin {
  const apiOrigin = apiBaseUrl ? new URL(apiBaseUrl).origin : ''
  const policy = [
    "default-src 'self'",
    `script-src 'self' ${KAKAO_SCRIPT_ORIGINS}`,
    `style-src 'self' 'unsafe-inline' ${KAKAO_ASSET_ORIGINS}`,
    `img-src 'self' data: blob: ${KAKAO_ASSET_ORIGINS}`,
    `font-src 'self' data: ${KAKAO_ASSET_ORIGINS}`,
    `connect-src 'self' ${KAKAO_SCRIPT_ORIGINS} ${apiOrigin}`.trim(),
    'frame-src *.daum.net *.kakao.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // GitHub Pages: https://ureca-UBot.github.io/UBot-FE/
    // 로컬 개발에서는 /
    base: mode === 'production' ? '/UBot-FE/' : '/',

    plugins: [react(), contentSecurityPolicy(env.VITE_API_BASE_URL?.trim() || undefined)],

    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})