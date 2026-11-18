import type {ReactNode} from 'react';

/**
 * 마크다운으로 저장하는 본문(주간보고·회의록 등)의 글자색·형광펜. 마크다운에는 <span data-color="red">…</span>(글자색),
 * <mark data-color="green">…</mark>(형광펜)로 남는다(옛 화면이 쓰던 표기 그대로). 이름은 편집기 색표(EditorSurface의
 * colors·backgrounds)와 같은 값으로 바꿔 그린다. 서버 변환(MarkdownBody·RichBodyMarkdown)도 같은 표를 쓴다.
 */
export const TEXT_COLORS:Record<string,string>={gray:'#9b9a97',brown:'#ba927a',orange:'#df9b65',yellow:'#d8bd6a',green:'#89af8b',blue:'#80afcf',purple:'#b59aca',pink:'#cf91b1',red:'#d98c87'};
export const MARK_COLORS:Record<string,string>={gray:'#363633',brown:'#493b34',orange:'#533f2c',yellow:'#514a2c',green:'#304638',blue:'#2d4153',purple:'#41344f',pink:'#4d3543',red:'#503631'};
const HEX=/^#[0-9a-fA-F]{6}$/;
const colorOf=(kind:'mark'|'span',key:string)=>HEX.test(key)?key:(kind==='mark'?MARK_COLORS:TEXT_COLORS)[key];

const ANY=/<(mark|span)\s+data-color="[#\w-]+"\s*>|<\/(mark|span)>/g;
const BLOCK=/^(\s*(?:[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+|#{1,6}\s+|>\s*)*)/;

/**
 * 노랑 형광펜(==…==)은 한 줄 안에서 짝이 맞을 때만 칠한다(비교식 a == b를 칠하지 않게).
 *
 * 색 태그를 줄마다 닫고 다시 연다. 옛 화면은 색이 여러 줄(문단 → 목록)에 걸쳐 열리고 닫히게 남겼는데, 마크다운은 줄(블록)을
 * 넘는 인라인 표기를 모른다. 줄 끝에서 열린 색을 닫고 다음 줄의 목록·제목 기호 뒤에서 다시 열어, 한 줄 안에서 짝이 맞게
 * 한다. 같은 색이 겹쳐 열린 것(<mark red><mark red>)은 하나로 친다. 코드 블록 안은 건드리지 않는다.
 */
export function repairColorTags(markdown:string):string{
 if(!markdown.includes('data-color='))return markdown;
 const open:{tag:string;key:string;depth:number}[]=[];let fenced=false;
 return markdown.split('\n').map(line=>{
  if(/^\s*(```|~~~)/.test(line)){fenced=!fenced;return line;}
  if(fenced||!line.trim())return line;
  const lead=BLOCK.exec(line)?.[1]??'';
  let body=line.slice(lead.length);
  const reopen=open.map(o=>`<${o.tag} data-color="${o.key}">`).join('');
  body=body.replace(ANY,token=>{
   const start=/^<(mark|span)\s+data-color="([#\w-]+)"/.exec(token);
   // 같은 색을 겹쳐 연 것은 하나로 그리되 몇 번 열렸는지 세어, 그만큼 닫혀야 끝낸다.
   if(start){const same=open.find(o=>o.tag===start[1]&&o.key===start[2]);if(same){same.depth++;return '';}open.push({tag:start[1]!,key:start[2]!,depth:1});return token;}
   const tag=/^<\/(mark|span)>$/.exec(token)![1]!;let at=-1;for(let i=open.length-1;i>=0;i--)if(open[i]!.tag===tag){at=i;break;}
   if(at<0)return '';if(--open[at]!.depth>0)return '';open.splice(at,1);return token;
  });
  const close=[...open].reverse().map(o=>`</${o.tag}>`).join('');
  return `${lead}${reopen}${body}${close}`;
 }).join('\n');
}

/** 색 태그 안의 글: 안쪽에 다른 색이 또 있으면 그것도 그린다. */
function colored(text:string,key:string):ReactNode[]{
 const out:ReactNode[]=[];let last=0,index=0;
 for(const match of text.matchAll(PAIR)){
  if(match.index>last)out.push(text.slice(last,match.index));
  out.push(paint(match,`${key}-${index++}`));
  last=match.index+match[0].length;
 }
 if(last<text.length)out.push(text.slice(last));
 return out.map(part=>typeof part==='string'?part.replace(STRAY,''):part);
}
const PAIR=/<(mark|span)\s+data-color="([#\w-]+)"\s*>([\s\S]*?)<\/\1>|==([^=\n]+?)==/g;
const STRAY=/<(mark|span)\s+data-color="[#\w-]+"\s*>|<\/(mark|span)>/g;
function paint(match:RegExpMatchArray,key:string):ReactNode{
 if(match[4]!==undefined)return <mark key={key} style={{backgroundColor:MARK_COLORS.yellow,color:'inherit',borderRadius:2}}>{colored(match[4],key)}</mark>;
 const kind=match[1] as 'mark'|'span',color=colorOf(kind,match[2]!);
 if(!color)return colored(match[3]??'',key);
 return kind==='mark'
  ?<mark key={key} style={{backgroundColor:color,color:'inherit',borderRadius:2}}>{colored(match[3]??'',key)}</mark>
  :<span key={key} style={{color}}>{colored(match[3]??'',key)}</span>;
}

/** 마크다운 화면의 인라인 확장 모양(정규식으로 찾고 그 자리를 그린다). Astryx Markdown의 inlinePlugins와 같은 모양이다. */
export type MarkdownInlinePlugin={pattern:RegExp;getEndIndex?:(text:string,match:RegExpMatchArray)=>number|false;render:(match:RegExpMatchArray,key:string)=>ReactNode};

/** 마크다운 화면의 인라인 확장: 글자 마디 안의 색 태그 짝과 ==노랑 형광펜==을 그리고, 짝이 없는 태그는 지운다. */
export const colorPlugin:MarkdownInlinePlugin={
 pattern:new RegExp(`${PAIR.source}|${STRAY.source}`,'g'),
 render:(match,key)=>match[0].startsWith('</')||(!match[3]&&match[4]===undefined&&match[0].startsWith('<'))?null:paint(match,key),
};
