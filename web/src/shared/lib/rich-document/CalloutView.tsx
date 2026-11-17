import {DocumentSelect} from './DocumentSelect';
import {NodeViewWrapper,NodeViewContent,ReactNodeViewRenderer,type NodeViewProps} from '@tiptap/react';
import {closeHistory} from '@tiptap/pm/history';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import {common,createLowlight} from 'lowlight';
import {Info,Lightbulb,CheckCircle2,TriangleAlert,OctagonAlert,NotebookPen,Code2} from './icons';
import {MediaNodeView} from './media-node';
import {Callout} from './schema';
import {BlockCopy,useEditable} from './block-ui';
import {tones,languages,lowlight,componentNodeViews} from './component-nodes';
export function CalloutView({node,editor,updateAttributes}:NodeViewProps){
 const editable=useEditable(editor),tone=tones.find(t=>t.value===node.attrs.tone)??tones[0],Icon=tone.icon;
 return <NodeViewWrapper as="aside" className="doc-callout" data-callout="" data-tone={tone.value} data-block-id={node.attrs.blockId}>
  <div className="callout-heading" contentEditable={false}><Icon size={17} strokeWidth={1.8}/><span>{tone.label}</span>{editable&&<DocumentSelect label="콜아웃 종류" value={tone.value} onChange={value=>{editor.view.dispatch(closeHistory(editor.state.tr));updateAttributes({tone:value});editor.view.dispatch(closeHistory(editor.state.tr));editor.commands.focus();}} options={tones.map(t=>({value:t.value,label:t.label}))}/>}</div>
  <NodeViewContent className="callout-body"/>
 </NodeViewWrapper>;
}
