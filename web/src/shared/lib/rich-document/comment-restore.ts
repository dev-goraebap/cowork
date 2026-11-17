import {getSchema} from '@tiptap/core';
import {studioExtensions} from './schema';
import {resolveAnchor,type CommentThread,type CommentSnapshot} from './comments';
import type {JSONNode} from './model';
export function restoreCommentThreads(threads:CommentThread[],body:JSONNode,snapshot?:CommentSnapshot){const doc=getSchema(studioExtensions()).nodeFromJSON(body);return threads.map(thread=>({...thread,anchor:resolveAnchor(snapshot?.anchors[thread.id]??thread.anchor,doc,!!snapshot?.anchors[thread.id])}));}
