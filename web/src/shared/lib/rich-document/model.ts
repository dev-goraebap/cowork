import type {CommentSnapshot} from './comments';
export const RICH_DOCUMENT_SCHEMA_VERSION=1 as const;
export type JSONNode={type:string;attrs?:Record<string,any>;content?:JSONNode[];text?:string;marks?:any[]};
export type DocumentRecord={id:string;title:string;body:JSONNode;revision:number;updated:string;restoration?:{beforeVersionId:string;restoredVersionId:string}};
export type VersionRecord={id:string;label:string;reason:string;title:string;created:string;body?:JSONNode;comments?:CommentSnapshot};
export function nodeText(node:JSONNode):string{return node.text??(['mathBlock','inlineMath','mermaidBlock','webEmbed'].includes(node.type)?String(node.attrs?.source??''):node.type==='media'?node.attrs?.name??'파일':node.content?.map(nodeText).join(node.type==='doc'?'\n':' ')??'');}
