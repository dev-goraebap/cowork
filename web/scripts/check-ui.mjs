import fs from 'node:fs';
import path from 'node:path';

/*
 * The rules of web/'s screens (shadcn/ui on Base UI + Tailwind CSS v4, Webcraft design-system), checked rather than
 * remembered. Colours come from the theme's tokens (src/app/theme/tailwind.css) through Tailwind utilities; a file paints
 * with semantic tokens only, spaces with flex/grid gaps, never re-colours for dark, and keeps style={{}} for data.
 * The parts received from the Webcraft registry (a flat file in shared/ui, and the folders below) keep the generated
 * code's own conventions: only the layer, icon and utils checks apply to them.
 */
const SRC = path.resolve('src');
const THEME = path.join(SRC, 'app', 'theme');
// The body editor keeps its own look and markup rules (one global stylesheet for ProseMirror content): only the layer,
// icon and utils checks apply to it.
const EDITOR = path.join(SRC, 'shared', 'lib', 'rich-document');
const SHARED_UI = path.join(SRC, 'shared', 'ui');
// Registry items that land as a folder in shared/ui (npx shadcn add @webcraft/<name>). Add a name when you receive one.
const KIT_FOLDERS = ['app-shell', 'body-edit', 'boot-cover', 'compose', 'document', 'editor', 'filter', 'icon', 'page', 'page-state',
  'peek', 'reading', 'reorder', 'settings', 'side-panel'];

const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? files(file) : /\.(tsx?|css)$/.test(file) ? [file] : [];
});
const inside = (file, dir) => file === dir || file.startsWith(dir + path.sep);
const isKitPart = file => (path.dirname(file) === SHARED_UI && file.endsWith('.tsx')) || KIT_FOLDERS.some(name => inside(file, path.join(SHARED_UI, name)));
// Pictures drawn in code, whose colours are the picture's own rather than the interface's; and the palette members pick
// marks' colours from, which are data the server keeps (#RRGGBB), not the interface's.
const PICTURES = [path.join('icons', 'solar-icons.ts'), path.join('avatar', 'model', 'drawn-avatars.ts'), path.join('color-palette', 'palette.ts'),
  // JPEG avatar exports flatten transparent source pixels onto white image pixels.
  path.join('features', 'picture-change', 'model', 'crop-picture.ts'),
  // Town sprite pixels and scene palettes are artwork data, independent of the app theme.
  path.join('pages', 'office', 'town', 'lib', 'game.ts'), path.join('pages', 'office', 'town', 'model', 'people-swatches.ts')];

/** Screen rules: every file but the kit's parts, the editor and the theme. `allow` lets a line (or the one above) say why. */
const SCREEN_RULES = [
  { why: '팔레트 색 클래스(bg-red-500 …): 의미 토큰으로', test: /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|shadow)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/ },
  { why: 'space-x/y-*: flex · grid와 gap으로', test: /\bspace-[xy]-/ },
  { why: 'dark: 색 덮어쓰기: 색은 토큰(app/theme/tailwind.css)에서만 바꾼다', test: /\bdark:(?:[\w-]+:)*(?:bg|text|border|ring|fill|stroke|outline|shadow)-/ },
  { why: 'style={{}}: 클래스로. 데이터 값이면 같은 줄이나 윗줄에 // check-ui: allow-style <사유>', tsx: true, test: /style=\{\{/, allow: /check-ui: allow-style\s+\S/ },
  { why: '!important', test: /!important/ },
  { why: '색 값을 직접 씀: 의미 토큰으로', test: /(?<![\w&])#[0-9a-fA-F]{3,8}\b(?![\w-])/, unless: f => PICTURES.some(picture => f.endsWith(picture)) },
  { why: '*.module.css: Tailwind 유틸리티로', test: /from\s+['"][^'"]+\.module\.css['"]/ },
];
/** Rules for every file, the kit's and the editor's too. */
const ALWAYS = [
  // Icons are Solar, called by lucide's names from the generated module (npm run icons:ui).
  { why: 'lucide-react: @/shared/ui/icon(Solar)으로', test: /from\s+['"]lucide-react['"]/ },
  // FSD names files by what they hold, so there is no shared/lib/utils: cn comes from the cn package (components.json's
  // utils alias is "cn", so shadcn add writes that too).
  { why: '@/shared/lib/utils: cn은 cn 패키지에서 가져온다(import { cn } from "cn")', test: /from\s+['"]@\/shared\/lib\/utils['"]/ },
];

const LAYERS = { shared: 0, entities: 1, features: 2, widgets: 3, pages: 4, app: 5 };
const errors = [];
for (const file of files(SRC)) {
  if (file.endsWith('.generated.ts')) continue;
  const isCss = file.endsWith('.css');
  const source = fs.readFileSync(file, 'utf8');
  const raw = source.split('\n');
  // Comments say what the rules forbid; only code is checked, its line numbers kept.
  const lines = source.replace(/\/\*[\s\S]*?\*\//g, block => block.replace(/[^\n]/g, '')).split('\n')
    .map(line => (isCss ? line : line.replace(/(^|\s)\/\/.*$/, '$1')));
  const where = index => `${path.relative(process.cwd(), file)}:${index + 1}`;
  const screenRules = isKitPart(file) || inside(file, EDITOR) || inside(file, THEME) ? [] : SCREEN_RULES;
  for (const rule of [...screenRules, ...ALWAYS]) {
    if (rule.tsx && isCss) continue;
    if (rule.unless?.(file)) continue;
    lines.forEach((line, index) => {
      if (!rule.test.test(line)) return;
      if (rule.allow && (rule.allow.test(raw[index]) || rule.allow.test(raw[index - 1] ?? ''))) return;
      errors.push(`${where(index)}: ${rule.why}`);
    });
  }
  // FSD's layers: a file imports only from layers below its own, and not from another slice of its own layer (shared
  // and app are not sliced). A part two slices of one layer both need moves down a layer, or into the one slice.
  // pages are grouped by space (pages/{instance,office,workspace}/<slice>, 2026-11-15): there the slice is the two parts.
  const [layer, first, second] = path.relative(SRC, file).split(path.sep);
  const slice = layer === 'pages' ? `${first}/${second}` : first;
  if (!isCss && layer in LAYERS) {
    lines.forEach((line, index) => {
      for (const [, target, one, two] of line.matchAll(/from\s+['"]@\/([a-z]+)\/([^/'"]+)(?:\/([^/'"]+))?/g)) {
        if (!(target in LAYERS)) continue;
        const targetSlice = target === 'pages' ? `${one}/${two}` : one;
        if (LAYERS[target] > LAYERS[layer]) errors.push(`${where(index)}: 아래 레이어(${layer})가 위 레이어(${target})를 가져다 씀`);
        else if (target === layer && targetSlice !== slice && !['shared', 'app'].includes(layer)) errors.push(`${where(index)}: 같은 레이어의 다른 슬라이스(${target}/${targetSlice})를 가져다 씀`);
      }
    });
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('화면 규칙을 통과했습니다.');
