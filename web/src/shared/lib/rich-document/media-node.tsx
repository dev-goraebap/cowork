import {useEffect,useRef,useState} from 'react';
import {NodeViewWrapper,ReactNodeViewRenderer,type NodeViewProps} from '@tiptap/react';
import {closeHistory} from '@tiptap/pm/history';
import {Image,Film,FileText,Music2,Download,RotateCw,AlertCircle,LoaderCircle} from './icons';
import {Media} from './schema';
import {useEditable} from './block-ui';
import {Button} from './Button';
export const clampWidth=(value:unknown)=>Math.min(100,Math.max(25,Number(value)||100));
export {WidthControl} from './WidthControl';
import {WidthControl} from './WidthControl';
export function bytes(size:number){return size>1024*1024?`${(size/1024/1024).toFixed(1)} MB`:size>1024?`${Math.round(size/1024)} KB`:size?`${size} B`:'';}
export {MediaView} from './MediaView';
import {MediaView} from './MediaView';
export const MediaNodeView=Media.extend({addNodeView(){return ReactNodeViewRenderer(MediaView);}});
