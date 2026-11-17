/** 마이크와 받아쓴 회의록 종이(회의록의 오른쪽 칸, 아무것도 고르지 않았을 때). 선은 보조 잉크, 표시는 그림 강조색. InboxIllustration과 같은 붓. */
export function MeetingIllustration() {
  return (
    <svg viewBox="0 0 320 176" aria-hidden="true" focusable="false" className="block h-44 w-80 max-w-full">
      <g className="stroke-icon-muted" fill="none" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
        <path d="M25 144c62-1 111 2 167 0 38-1 69-1 101 0M41 150l58 1m103 0 68-1M116 153h40" opacity=".45" />
        <path d="m146 34 76-4a4 4 0 0 1 4 4l4 104a4 4 0 0 1-4 4l-76 3a4 4 0 0 1-4-4l-4-103a4 4 0 0 1 4-4z" className="fill-background" />
        <path d="m158 52 48-2m-47 14 54-2m-53 14 40-2m-39 16 52-2m-51 14 30-1" opacity=".65" />
        <path d="m159 120 44-2" opacity=".45" />
        <path d="M100 58a14 14 0 0 1 28 0v30a14 14 0 0 1-28 0z" className="fill-background" />
        <path d="M100 70h10m-10 12h10m8-12h10m-10 12h10" opacity=".5" />
        <path d="M92 86a22 22 0 0 0 44 0M114 108v22m-14 0h28" />
        <path d="M32 142c3-11 10-13 12 0m-2 0c5-20 12-16 12 0m210 0c1-11 8-13 10 0m1 0c3-16 10-14 11 0" opacity=".55" />
        <path d="m66 60 5-4m-1 13 5-2m180-30 5 1m-7 6 8 3" opacity=".55" />
      </g>
      <g className="stroke-illustration-accent" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M78 66c-4 7-4 15 0 22m-8-28c-7 11-7 23 0 34m80-28c4 7 4 15 0 22" />
        <path d="M250 96v10m-5-5h10M58 104v8m-4-4h8" opacity=".65" />
        <path d="M159 104h26" />
      </g>
      <circle className="fill-illustration-accent" cx="216" cy="40" r="3" />
    </svg>
  )
}
