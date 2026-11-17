/**
 * 국내 전화번호의 한 가지 표기. 입력은 숫자만 받고 하이픈은 이 규칙으로 넣는다. 사용자가 하이픈을 넣든 빼든 같은 값이 된다.
 * - 02(서울): 02-123-4567, 02-1234-5678
 * - 그 밖(휴대전화 010·011…, 지역 031…, 070 등): 010-1234-5678, 031-123-4567
 * - 0으로 시작하는 9~11자리만 번호로 본다.
 */
export const phoneDigits = (value: string) => value.replace(/\D/g, '').slice(0, 11);

export function formatPhone(value: string) {
  const digits = phoneDigits(value);
  const head = digits.startsWith('02') ? 2 : 3;
  if (digits.length <= head) return digits;
  const rest = digits.slice(head);
  if (rest.length <= 3) return `${digits.slice(0, head)}-${rest}`;
  const middle = rest.length >= 8 ? 4 : rest.length - 4 >= 3 ? rest.length - 4 : 3;
  return `${digits.slice(0, head)}-${rest.slice(0, middle)}-${rest.slice(middle)}`;
}

export const isPhone = (value: string) => /^0\d{8,10}$/.test(phoneDigits(value)) && (phoneDigits(value).startsWith('02') ? phoneDigits(value).length <= 10 : phoneDigits(value).length >= 10);
