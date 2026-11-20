# cowork

프로젝트 · 업무 · 문서를 한곳에서 다루는 작업 공간입니다. 설치형이며, 처음 띄우면 첫 관리자를 만들고 그 관리자가 구성원을 이메일로 더합니다. 지침과 문서는 한국어로 씁니다. 공개 저장소이므로 특정 회사의 이름 · 주소 · 업무 데이터 · 접속 정보와 비밀값을 넣지 않습니다.

## 구성

- `server/`: Spring Boot · jOOQ · Flyway · SQLite API. 기본 패키지는 `xyz.goraebap.cowork`이고, 소스는 기술 기반 `shared`와 모듈 `module`로 나눕니다. 모듈은 `user` · `file` · `notification` · `system` · `seed` · `realtime` · `search` · `mcp`와 `workspace`(`project` · `issue` · `document` · `richbody` · `activity`)입니다.
- `web/`: React · Vite · TanStack Router/Query · shadcn/ui(Base UI) · Tailwind CSS v4 화면. FSD로 나눕니다. 화면 컴포넌트는 키트(`web/src/shared/ui/kit`: shadcn을 다듬은 컴포넌트와 Webapp 키트 컴포넌트)에 두고, cowork가 만든 공용 컴포넌트는 `web/src/shared/ui`에 둡니다. 키트는 cowork의 코드이며 Webapp 지침이 가리키는 키트 원본입니다.
- 에이전트는 `/api/mcp`의 MCP 서버로 붙습니다. 토큰은 각자 내 계정 › 내 AI 에이전트에서 만듭니다.

<!-- webapp@dev-goraebap:start -->
## 개발 지침

이 프로젝트는 Webapp 플러그인(0.15.3 이상)의 지침을 따릅니다. 작업을 시작할 때 goraebap-mode를 읽고, 바꾸는 영역의 지침(frontend·ui-ux·backend·api·database·architecture)을 함께 읽습니다. 아래 프로젝트 규칙이 지침과 다르면 프로젝트 규칙을 따릅니다. Webapp 지침을 읽을 수 없거나 설치된 버전이 위 버전보다 낮으면 추측으로 진행하지 않습니다. 작업 상태를 이어받기 문서로 남기고, 플러그인 설치·갱신 방법과 새 세션에서 읽을 문서 경로를 사용자에게 알립니다.

- Webapp 어댑터: cowork
<!-- webapp@dev-goraebap:end -->

## 프로젝트 규칙

지침과 다르게 하는 것은 없습니다.

## 실행과 검증

- 로컬: 저장소 루트에서 `sh dev.sh`(서버 8080, 화면 4420). 한쪽만 띄우려면 `sh dev.sh server`, `sh dev.sh web`. DB와 파일은 `server/data/`에 생기고, 메일 서버가 없으면 로그인 인증 코드는 서버 로그에 찍힙니다.
- 서버 코드를 바꾸면 `server/`에서 `./gradlew test integrationTest`.
- 화면 코드를 바꾸면 `web/`에서 `npm run check`.
- 커밋 · 푸시 · 배포는 사용자가 요청한 범위에서만 합니다.
