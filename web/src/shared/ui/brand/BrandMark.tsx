/**
 * cowork의 심벌: 겹친 두 원(함께 일하는 둘). 글자 색으로 그려 테마와 모드를 따른다. 정사각형이고 size가 한 변이다. label을 비우면
 * 옆에 선 것(이름을 적은 로고)에 맡긴다.
 */
export function BrandMark({ size = '1.5rem', label = 'cowork' }: { size?: string; label?: string }) {
  return <svg viewBox="0 0 64 64" width={size} height={size} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })} fill="currentColor">
    <path fillRule="evenodd" d="M24 8a24 24 0 1 1 0 48a24 24 0 1 1 0-48M24 19a13 13 0 1 0 0 26a13 13 0 1 0 0-26" />
    <path d="M40 8a24 24 0 1 1 0 48a24 24 0 0 1-10.4-2.4a29 29 0 0 0 0-43.2A24 24 0 0 1 40 8Z" />
  </svg>;
}
