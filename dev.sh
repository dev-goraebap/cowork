#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
usage='사용법: sh dev.sh [all|server|web]'
mode=${1:-all}
if [ "$#" -gt 1 ]; then
  echo "$usage" >&2
  exit 2
fi

gradle_args='bootRun --console=plain --args=--spring.profiles.active=dev'
case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*) gradle='gradlew.bat' ;;
  *) gradle='sh ./gradlew' ;;
esac

# The server needs nothing set: the database and files go under server/data/, secrets are made on first start, and
# login codes are written to the server log. server/.env is read when present (.env.example lists what it can hold).
prepare_server() {
  :
}

prepare_web() {
  if [ ! -d "$root/web/node_modules" ]; then
    echo 'web에서 npm ci를 먼저 실행하세요.' >&2
    exit 1
  fi
}

case "$mode" in
  server)
    prepare_server
    cd "$root/server"
    exec sh ./gradlew $gradle_args
    ;;
  web)
    prepare_web
    cd "$root/web"
    exec npm run dev
    ;;
  all)
    prepare_web
    prepare_server
    cd "$root/web"
    # Windows에서는 sh를 거치면 프로세스 트리가 끊겨 -k로 남은 쪽을 종료하지 못하므로 명령을 직접 넘긴다.
    # 화면은 서버가 health에 답한 뒤에 띄운다(scripts/wait-for-server.mjs).
    exec npx --yes concurrently@10.0.5 -k -n server,web -c blue,green \
      "cd ../server && $gradle $gradle_args" 'node ../scripts/wait-for-server.mjs && npm run dev'
    ;;
  *)
    echo "$usage" >&2
    exit 2
    ;;
esac
