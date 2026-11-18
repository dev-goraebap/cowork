# cowork

프로젝트 · 업무 · 문서를 한곳에서 다루는 설치형 작업 공간입니다.

- 프로젝트마다 업무 보드 · 목록 · 타임라인, 사이클, 문서(하위 페이지 · 블록 댓글 · 버전 기록)
- 저장소 연동(GitHub · GitLab · Gitea): 커밋 · 머지 요청이 업무에 이어집니다
- 에이전트용 MCP 서버(`/api/mcp`): 구성원마다 토큰을 만들어 AI 에이전트가 같은 권한으로 일합니다
- 이메일 인증 코드 로그인, 웹 푸시 알림

## 처음 시작하기

필요한 것: JDK 21, Node.js 24.

```sh
cd web && npm ci && cd ..
sh dev.sh
```

http://localhost:4420 을 열면 첫 관리자를 만드는 화면이 나옵니다. 이름과 이메일을 적으면 그 주소로 인증 코드를 보냅니다. 메일 서버(`MAIL_HOST`)를 정하지 않았으면 코드는 서버 로그에 찍힙니다. 첫 관리자는 로고 옆 전환의 인스턴스 관리 › 구성원 · 권한에서 구성원을 더합니다.

## 구성

| 폴더 | 내용 |
| --- | --- |
| `server/` | Spring Boot · jOOQ · Flyway · SQLite API |
| `web/` | React · Vite · TanStack · shadcn/ui 화면 |

서버 설정은 `server/src/main/resources/application.properties`에 환경 변수 이름과 함께 적혀 있습니다.
