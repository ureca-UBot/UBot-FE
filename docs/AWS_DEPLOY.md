# AWS FE 배포 (u-bot.cloud)

`https://u-bot.cloud`는 AWS FE EC2(`ubot-fe`, Ubuntu 24.04)의 Nginx가 정적 파일을 서비스하고, `/api/`를 BE EC2로 넘깁니다. 이 문서는 서버에 손으로 해 둔 설정과 CD 흐름을 정리합니다. GitHub Pages 배포(`frontend-pages.yml`)와는 별개입니다.

## 서버 구성

| 항목 | 값 |
|---|---|
| 인스턴스 | `ubot-fe` (t3.small, 사설 IP 10.20.22.42). 인스턴스 ID는 GitHub Secret `AWS_FE_INSTANCE_ID` |
| 접속 | SSM Session Manager (`ssm-user`) |
| Nginx | 1.24 (Ubuntu 패키지). 사이트 설정은 [scripts/deploy/nginx/ubot-fe.conf](../scripts/deploy/nginx/ubot-fe.conf)와 같습니다 |
| HTTPS | Certbot 2.9 (`--nginx`), 인증서 `/etc/letsencrypt/live/u-bot.cloud/`, `certbot.timer`로 자동 갱신 |
| Node | NodeSource `nodejs` 22. npm은 `/usr/lib/node_modules/npm/bin/npm`에 있고 `/usr/bin/npm` 링크는 없습니다 |
| 방화벽 | ufw 꺼짐. AWS 보안 그룹으로 제어 |

```text
/srv/ubot-fe/
├── current -> releases/<짧은SHA>-<UTC시각>   Nginx root
├── previous-release                          직전 릴리스 경로 (CD가 기록)
├── releases/                                  릴리스 폴더, 최근 5개 보관
└── src/                                       CD가 빌드하는 저장소 (ssm-user 소유)

/home/ssm-user/ubot-fe/.env.local              서버 전용 빌드 설정 (Git에 넣지 않음)
```

## Nginx

- `root /srv/ubot-fe/current`. 릴리스는 `current` 링크만 바꾸면 되므로 Nginx를 다시 읽을 필요가 없습니다.
- `location /api/` → `http://10.20.19.183`(BE EC2 사설 IP, BE Nginx가 `/api`를 떼고 백엔드로 전달). `X-Forwarded-For`를 클라이언트 IP로 덮어써서 BE가 사용자 IP를 알 수 있게 합니다.
- 80 포트는 HTTPS로 이동만 합니다. `# managed by Certbot` 줄은 Certbot이 넣은 것입니다.
- 저장소의 `ubot-fe.conf`는 서버 파일을 그대로 복사한 것입니다. 서버와 같은지 확인하려면 두 파일의 `sha256sum`을 비교합니다.

설정을 바꿀 때는 저장소 파일을 먼저 고치고, 서버에 반영합니다.

```bash
sudo cp ubot-fe.conf /etc/nginx/sites-available/ubot-fe && sudo nginx -t && sudo systemctl reload nginx
```

## 빌드 설정

- `vite.config.ts`의 운영 빌드 경로는 GitHub Pages용 `/UBot-FE/`입니다. AWS 빌드는 루트에서 서비스하므로 `npm run build -- --base /`로 빌드합니다. 코드는 바꾸지 않습니다.
- `/home/ssm-user/ubot-fe/.env.local`에 `VITE_KAKAO_JAVASCRIPT_KEY`가 있습니다. CD가 빌드할 때 이 파일을 `.env.production.local`로 복사해 씁니다.
- `VITE_API_BASE_URL`은 항상 빈 값(같은 origin의 `/api`), `VITE_COUNSEL_ENABLED`는 GitHub 변수 `AWS_FE_COUNSEL_ENABLED`(기본 `false`)를 씁니다. 빌드 명령의 환경변수가 `.env.local` 값보다 우선합니다.

## CD (`.github/workflows/aws-fe-deploy.yml`)

```text
develop push ──▶ verify: npm ci → lint → format:check → test → build --base /
            ──▶ deploy: SSM으로 FE EC2에 scripts/deploy/aws-fe-release.sh 실행
                 그 커밋 fetch → npm ci → build (ssm-user, 메모리 1GB 제한)
                 → releases/에 복사 → current 링크 교체 → 로컬 Nginx로 확인
                 → 실패하면 이전 릴리스로 자동 복구 → 오래된 릴리스 정리
            ──▶ https://u-bot.cloud 공개 확인
```

GitHub 설정:

| 종류 | 이름 | 값 |
|---|---|---|
| Secret | `AWS_FE_ROLE_ARN` | `arn:aws:iam::<계정 ID>:role/ubot-fe-cd` |
| Secret | `AWS_FE_INSTANCE_ID` | FE 인스턴스 ID (`i-…`) |
| Variable | `AWS_FE_DEPLOY_ENABLED` | `true`면 배포, `false`면 서버 고정 |
| Variable | `AWS_FE_COUNSEL_ENABLED` | 선택. 기본 `false`. BE `COUNSEL_ENABLED`와 맞춥니다 |

AWS 역할 `ubot-fe-cd`는 GitHub OIDC로만 쓸 수 있고(`repo:ureca-UBot@326730402/UBot-FE@1362033936:ref:refs/heads/develop`), FE 인스턴스 하나에만 `AWS-RunShellScript` 명령을 보낼 수 있습니다. 이 저장소의 OIDC `sub`에는 조직·저장소 ID가 붙습니다.

## 되돌리기

릴리스 폴더가 남아 있으므로 링크만 바꾸면 됩니다.

```bash
ls -1t /srv/ubot-fe/releases && cat /srv/ubot-fe/previous-release
```

```bash
sudo ln -sfn "$(cat /srv/ubot-fe/previous-release)" /srv/ubot-fe/current.next && sudo mv -Tf /srv/ubot-fe/current.next /srv/ubot-fe/current
```

되돌린 뒤 다음 develop push가 다시 최신 커밋을 배포하므로, 문제 커밋은 develop에서 고치거나 되돌립니다. 그동안 `AWS_FE_DEPLOY_ENABLED=false`로 배포를 멈출 수 있습니다.

## 새 서버를 만들 때

1. Ubuntu 24.04, SSM Agent 연결(계정의 기본 호스트 관리 설정 또는 `AmazonSSMManagedInstanceCore` 역할).
2. `nginx`, `git`, `certbot`, `python3-certbot-nginx`, NodeSource `nodejs` 22 설치.
3. `sudo mkdir -p /srv/ubot-fe/releases`, `/home/ssm-user/ubot-fe/.env.local`에 `VITE_KAKAO_JAVASCRIPT_KEY` 작성.
4. `ubot-fe.conf`에서 `# managed by Certbot` 줄을 뺀 채 `listen 80`으로 올리고, `sudo certbot --nginx -d u-bot.cloud`로 인증서를 받습니다. Certbot이 HTTPS 줄을 다시 넣습니다.
5. 도메인 A 레코드를 새 서버 공인 IP로 바꾸고, BE 보안 그룹의 80 포트 허용 대상에 새 서버 보안 그룹을 넣습니다. BE `.env`의 `FE_PRIVATE_IP`도 새 사설 IP로 바꿉니다.
6. `AWS_FE_INSTANCE_ID`와 `ubot-fe-cd` 역할 정책의 인스턴스 ARN을 새 ID로 바꾸고, develop에서 `AWS FE CD`를 실행합니다.
