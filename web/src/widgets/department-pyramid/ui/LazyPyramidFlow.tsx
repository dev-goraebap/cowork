import { lazy } from 'react';

/**
 * The canvas library (React Flow, d3-hierarchy) is only for the chart, so it loads when the 조직도 tab first draws it,
 * not with the app.
 */
export const preparePyramidFlow = () => import('./PyramidFlow').then(module => ({ default: module.PyramidFlow }));
export const LazyPyramidFlow = lazy(preparePyramidFlow);
