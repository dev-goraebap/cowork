import {useEffect,useState} from 'react';
import {History,X,RotateCw,Clock3,Bookmark,ShieldCheck,ArrowLeft,ArrowRight,Plus,Minus,Pencil,MoveRight,FileText,LoaderCircle} from './icons';
import {Button} from './Button';
import {nodeText,type JSONNode,type VersionRecord} from './model';
import {blockNames,textParts,type Change,type ChangeKind} from './version-diff';
import {reasonNames,date,time,kinds,labels,icons} from './VersionViews';
export function Snippet({before,after}:{before?:JSONNode;after?:JSONNode}){const a=before?nodeText(before):'',b=after?nodeText(after):'';const part=textParts(a,b);if(a===b)return <div className="diff-same-text">{a.slice(0,400)||'텍스트 없는 블록'}{a.length>400?'…':''}</div>;return <div className="diff-text-pair">{before&&<div className="diff-text-before"><small>이전</small><p>{part.prefix}<del>{part.removed}</del>{part.suffix}</p></div>}{after&&<div className="diff-text-after"><small>현재</small><p>{part.prefix}<ins>{part.added}</ins>{part.suffix}</p></div>}</div>;}
