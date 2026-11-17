import type {ReactElement, ReactNode} from 'react';
import {Button} from '@/shared/ui/button';
import {DropdownMenu,DropdownMenuContent,DropdownMenuRadioGroup,DropdownMenuRadioItem,DropdownMenuTrigger} from '@/shared/ui/dropdown-menu';
import {Tooltip,TooltipContent,TooltipTrigger} from '@/shared/ui/tooltip';
import {Pencil,History,Check,CaseSensitive,MessageSquare} from './icons';
export type DocumentFont='default'|'serif'|'mono';

const FONTS:{value:DocumentFont;label:string}[]=[{value:'default',label:'기본 고딕'},{value:'serif',label:'명조 · 마루 부리'},{value:'mono',label:'고정폭'}];

/** 툴팁을 단 둥근 도구 단추(키트 tool 단추). */
function Tool({label,children,...props}:{label:string;children:ReactElement}&Record<string,unknown>){
 return <Tooltip><TooltipTrigger render={children} {...props}/><TooltipContent>{label}</TooltipContent></Tooltip>;
}

/**
 * 본문 위 오른쪽의 문서 도구: 글꼴 · 댓글 · 버전 기록 · 읽기/편집. 둥근 아이콘 단추(키트 tool)와 툴팁이고, 글꼴은 고르는 메뉴다.
 * status is the host's save line, shown at the toolbar's start so it sticks with the tools (cowork).
 */
export function DocumentToolbar({mode,onMode,font,onFont,onHistory,onComments,disabled=false,status}:{mode:'read'|'edit';onMode:(mode:'read'|'edit')=>void;font:DocumentFont;onFont:(font:DocumentFont)=>void;onHistory?:()=>void;onComments?:()=>void;disabled?:boolean;status?:ReactNode}){
 const isEditing=mode==='edit';
 return <div className="bit-rich-document rd-document-toolbar" role="toolbar" aria-label="문서 도구">
  {status&&<div className="rd-document-status">{status}</div>}
  <div className="rd-document-actions">
   <DropdownMenu>
    <Tool label="본문 글꼴"><DropdownMenuTrigger render={<Button variant="tool" size="icon-sm" aria-label="본문 글꼴"/>}><CaseSensitive size={16}/></DropdownMenuTrigger></Tool>
    <DropdownMenuContent align="end" className="w-44">
     <DropdownMenuRadioGroup value={font} onValueChange={value=>onFont(value as DocumentFont)}>
      {FONTS.map(each=><DropdownMenuRadioItem key={each.value} value={each.value}>{each.label}</DropdownMenuRadioItem>)}
     </DropdownMenuRadioGroup>
    </DropdownMenuContent>
   </DropdownMenu>
   {onComments&&<Tool label="댓글 열기"><Button variant="tool" size="icon-sm" aria-label="댓글 열기" onClick={onComments}><MessageSquare size={16}/></Button></Tool>}
   {onHistory&&<Tool label="버전 기록"><Button variant="tool" size="icon-sm" aria-label="버전 기록" onClick={onHistory}><History size={16}/></Button></Tool>}
   <Tool label={isEditing?'편집 완료':'문서 편집'}>
    <Button variant={isEditing?'default':'tool'} size="icon-sm" className="rounded-full" aria-label={isEditing?'편집 완료':'문서 편집'} disabled={disabled}
     onClick={()=>onMode(isEditing?'read':'edit')}>{isEditing?<Check size={16}/>:<Pencil size={16}/>}</Button>
   </Tool>
  </div>
 </div>;
}
