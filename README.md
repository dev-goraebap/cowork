# cowork

프로젝트 · 업무 · 문서를 한곳에서 다루고 AI 에이전트(MCP)와 함께 일하는 설치형 팀 작업 공간입니다.

## 특징

- **단일 컨테이너 · 외부 DB 불필요**: SQLite와 로컬 파일 저장소(또는 S3/R2)만으로 동작합니다. 시크릿 키와 웹 푸시 키도 첫 기동 시 자동 생성됩니다.
- **업무와 문서를 한곳에서**: 프로젝트별 보드 · 목록 · 타임라인 · 사이클과 하위 페이지 · 블록 댓글 · 버전 기록을 지원하는 문서를 함께 다룹니다.
- **내장 MCP 서버(`/api/mcp`)**: 구성원 각자가 토큰을 발급하면 AI 에이전트가 해당 구성원과 같은 권한 경계 안에서 업무와 문서를 읽고 씁니다.
- **개발 워크플로 연결**: GitHub · GitLab · Gitea 저장소를 연동해 커밋과 PR/MR을 업무에 연결합니다. 이메일 인증 코드 로그인과 웹 푸시 알림을 지원합니다.

## Docker로 시작하기

단일 이미지에 서버와 화면이 함께 들어 있습니다.

```sh
docker build -t cowork .
docker run -d \
  --name cowork \
  -p 8080:8080 \
  -v cowork-data:/var/lib/cowork \
  -e AUTH_ALLOWED_ORIGINS=http://localhost:8080 \
  -e AUTH_COOKIE_SECURE=false \
  cowork
```

> HTTPS 뒤에서 운영할 때는 `AUTH_ALLOWED_ORIGINS`에 실제 도메인(`https://...`)을 지정하고 `AUTH_COOKIE_SECURE=false`는 빼세요.

브라우저에서 `http://localhost:8080`을 열면 첫 관리자 생성 화면이 나옵니다. 메일 서버(`MAIL_HOST`)를 설정하지 않은 경우 로그인 인증 코드는 서버 로그에 출력됩니다. 첫 관리자는 인스턴스 관리 › 구성원 · 권한에서 팀원을 이메일로 초대할 수 있습니다.

## AI 에이전트 연결 (MCP)

cowork는 `/api/mcp` 경로에 Streamable HTTP 방식의 MCP 서버를 내장하고 있습니다.

1. cowork에 로그인한 뒤 **내 계정 › 내 AI 에이전트**에서 토큰을 발급합니다.
2. 사용하는 MCP 클라이언트에 엔드포인트와 Bearer 토큰을 등록합니다.

```sh
# Claude Code 예시
claude mcp add --transport http cowork https://your-cowork.example.com/api/mcp \
  --header "Authorization: Bearer <발급받은_토큰>"
```

에이전트의 모든 요청은 발급한 구성원의 권한을 따르며 활동 기록에 남습니다.

## 주요 환경 변수

필수 설정은 `AUTH_ALLOWED_ORIGINS` 하나이며, 나머지는 필요할 때만 지정합니다. 전체 목록은 [application.properties](server/src/main/resources/application.properties)에서 확인할 수 있습니다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `AUTH_ALLOWED_ORIGINS` | *(필수)* | 접속을 허용할 웹 주소 (쉼표로 여러 개 지정 가능) |
| `AUTH_COOKIE_SECURE` | `true` | HTTPS 전용 쿠키 여부 (로컬 HTTP 테스트 시 `false`) |
| `DB_PATH` | `./data/cowork.db` | SQLite DB 파일 경로 (Docker 기본값 `/var/lib/cowork/cowork.db`) |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_FROM` | *(비어 있음)* | SMTP 메일 서버 설정. 비워 두면 인증 코드를 서버 로그로 출력 |
| `STORAGE_ENDPOINT` / `STORAGE_BUCKET` | *(비어 있음)* | S3/R2 객체 스토리지 설정. 비워 두면 로컬 디스크(`STORAGE_LOCAL_ROOT`) 사용 |
| `INSTANCE_ADMIN_EMAILS` | *(비어 있음)* | 기동 시 인스턴스 관리자 권한을 부여할 이메일 목록 (쉼표 구분) |

## 로컬 개발

필요한 도구: **JDK 21**, **Node.js 24**

```sh
cd web && npm ci && cd ..
sh dev.sh
```

서버(`8080`)와 화면(`4420`)이 함께 뜹니다. `http://localhost:4420`으로 접속하면 됩니다. 한쪽만 실행하려면 `sh dev.sh server` 또는 `sh dev.sh web`을 사용합니다.

| 폴더 | 기술 스택 |
| --- | --- |
| `server/` | Spring Boot · jOOQ · Flyway · SQLite |
| `web/` | React · Vite · TanStack Router / Query · shadcn/ui · Tailwind CSS v4 |
