// 키트(shared/ui/kit)를 Webcraft 레지스트리 원본과 비교한다. kit.lock.json이 파일마다 "cowork에서 고쳤는지"를 적어 두고,
// 이 스크립트는 그 표시가 지금과 맞는지 알린다: 고쳤는데 표시가 없거나, 표시는 있는데 이제 원본과 같아진 것.
//   npm run kit:check            레지스트리(components.json의 @webcraft 주소)에서 원본을 받아 비교
//   npm run kit:check -- --write 비교 결과로 kit.lock.json의 modified 표시를 고쳐 쓴다
//   KIT_REGISTRY=<폴더>           원본을 내려받지 않고 로컬의 r 폴더(dev.goraebap client/apps/blog/public/r)에서 읽는다
import fs from 'node:fs';
import path from 'node:path';

const write = process.argv.includes('--write');
const lockFile = path.resolve('kit.lock.json');
const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
const template = JSON.parse(fs.readFileSync('components.json', 'utf8')).registries['@webcraft'];
const norm = text => text.replace(/\r\n/g, '\n').trimEnd();

async function item(name) {
  if (process.env.KIT_REGISTRY) return JSON.parse(fs.readFileSync(path.join(process.env.KIT_REGISTRY, `${name}.json`), 'utf8'));
  const response = await fetch(template.replace('{name}', name));
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  return response.json();
}

const items = new Map();
const report = { same: [], modified: [], unmarked: [], stale: [], missing: [] };
for (const file of lock.files) {
  if (!items.has(file.item)) items.set(file.item, await item(file.item).catch(error => ({ error })));
  const source = items.get(file.item);
  // 레지스트리가 옛 경로(src/shared/ui/…)든 새 경로(src/shared/ui/kit/…)든 찾는다.
  const original = source.files?.find(each => [file.registryPath, file.path].includes(each.target ?? each.path));
  if (!original) { report.missing.push(file.path); continue; }
  // 레지스트리가 아직 옛 경로로 내보내면 원본의 가져오기도 옛 경로(@/shared/ui/x)다: kit/ 차이는 고친 것으로 치지 않는다.
  const local = norm(fs.readFileSync(file.path, 'utf8'));
  const differs = ![local, local.replaceAll('@/shared/ui/kit/', '@/shared/ui/')].includes(norm(original.content ?? ''));
  if (differs && !file.modified) report.unmarked.push(file.path);
  else if (!differs && file.modified) report.stale.push(file.path);
  else (differs ? report.modified : report.same).push(file.path);
  if (write) file.modified = differs;
}
console.log(`원본과 같음 ${report.same.length} · 고침(표시됨) ${report.modified.length}`);
for (const [key, label] of [['unmarked', '고쳤는데 표시가 없음'], ['stale', '표시는 고침인데 원본과 같음'], ['missing', '레지스트리에 없음']]) {
  if (report[key].length) console.log(`${label} ${report[key].length}\n  ${report[key].join('\n  ')}`);
}
if (write) {
  fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2) + '\n');
  console.log('kit.lock.json을 고쳐 썼습니다.');
} else if (report.unmarked.length || report.stale.length) process.exitCode = 1;
