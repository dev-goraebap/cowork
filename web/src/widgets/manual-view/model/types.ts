/**
 * A guide document as blocks. Text in a paragraph, a step or a callout is inline Markdown: `코드`, **굵게**, [링크](…).
 * A heading inside a section is a third-level one with its own id, so the table of contents can point at it.
 */
export type ManualBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; id: string; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'callout'; tone: 'info' | 'warning' | 'success'; title: string; text?: string }
  | { kind: 'image'; caption: string; ratio?: number }
  | { kind: 'code'; code: string; language?: string; title?: string };

/** A section of a guide: a second-level heading (its id the anchor) and its blocks. */
export type ManualSection = { id: string; title: string; icon?: string; blocks: ManualBlock[] };

export type Manual = {
  title: string;
  /** One line under the title saying what the guide is for. */
  summary?: string;
  author: string;
  authorPicture?: string;
  /** The day it was last changed, as 2026-11-03 (reads 11월 3일 수정). */
  updated: string;
  sections: ManualSection[];
};
