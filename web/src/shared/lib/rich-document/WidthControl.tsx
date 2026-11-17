import {DocumentSelect} from './DocumentSelect';
import {useEffect,useRef,useState} from 'react';
import {NodeViewWrapper,ReactNodeViewRenderer,type NodeViewProps} from '@tiptap/react';
import {closeHistory} from '@tiptap/pm/history';
import {Image,Film,FileText,Music2,Download,RotateCw,AlertCircle,LoaderCircle} from './icons';
import {Media} from './schema';
import {useEditable} from './block-ui';
import {Button} from './Button';
import {clampWidth,bytes,MediaNodeView} from './media-node';
export function WidthControl({value,onChange,label='미디어 너비'}:{value:number;onChange:(value:number)=>void;label?:string}){return <DocumentSelect className="media-width" label={label} value={String(value)} onChange={value=>onChange(Number(value))} options={[...(![25,50,75,100].includes(value)?[value]:[]),25,50,75,100].map(n=>({value:String(n),label:`${n}%`}))}/>;}
