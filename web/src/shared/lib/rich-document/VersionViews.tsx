import {Plus,Minus,Pencil,MoveRight} from './icons';
import {type ChangeKind} from './version-diff';
export const reasonNames:Record<string,string>={created:'처음 작성',manual:'직접 저장',automatic:'자동 저장',baseline:'편집 시작 전',restored:'복원됨','before-restore':'복원 전 보관'};
export const date=(s:string)=>new Date(s).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'});
export const time=(s:string)=>new Date(s).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
export {VersionPanel} from './VersionPanel';
export const kinds:ChangeKind[]=['added','removed','changed','moved'];
export const labels:Record<ChangeKind,string>={added:'추가',removed:'삭제',changed:'수정',moved:'이동'};
export const icons={added:Plus,removed:Minus,changed:Pencil,moved:MoveRight};
export {Snippet} from './Snippet';
export {VersionChanges} from './VersionChanges';
export {VersionBanner} from './VersionBanner';

