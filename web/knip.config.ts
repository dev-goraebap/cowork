import type { KnipConfig } from 'knip';

/** 안 쓰는 파일 · export · 패키지 찾기. 라우트는 생성된 routeTree.gen.ts를 거쳐 entry.tsx에서 이어진다. */
const config: KnipConfig = {
  entry: ['src/app/entry.tsx', 'scripts/**/*.{mjs,js}', 'public/*.js'],
  project: ['src/**/*.{ts,tsx,css}', 'scripts/**/*.{mjs,js}'],
  ignore: ['src/app/router/routeTree.gen.ts', 'src/shared/api/schema.d.ts'],
  // CSS의 @import · @plugin도 가져오기로 읽는다(글꼴 · Tailwind 플러그인).
  compilers: {
    css: (text: string) => [...text.replaceAll('@plugin', '@import').matchAll(/(?<=@)import[^;]+/g)].join('\n'),
  },
};

export default config;
