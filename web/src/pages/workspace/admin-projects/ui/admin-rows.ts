/** A page's path as the router hands it (icons by meaning name); pageCrumbs turns it into the kit Page's. */
export type Crumb = { label: string; href?: string; icon?: string };

/**
 * 프로젝트 관리's ordered rows (업무 유형 · 라벨): a grip, the mark, the name (with 기본), how many work items use it, the menu.
 * A phone's grip and menu take a thumb's 44px.
 */
export const ADMIN_ROW = 'grid min-h-11 grid-cols-[1.25rem_1rem_minmax(0,1fr)_auto_2rem] items-center gap-x-3 px-2 max-md:grid-cols-[2.75rem_1rem_minmax(0,1fr)_auto_2.75rem]';
export const ADMIN_ROW_NAME = 'min-w-0 truncate';
