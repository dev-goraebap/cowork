import test from 'node:test';
import assert from 'node:assert/strict';
import { crumbsOf } from '../src/widgets/app-shell/model/nav.ts';
import { crumbsUnder } from '../src/shared/ui/reading/model/crumbs.ts';

test('meeting and weekly report details retain the document box and link back to the system folder', () => {
  for (const [path, name, list] of [['/meetings/one', '회의록', '/documents?system=meetings'], ['/weekly-reports/one', '주간보고', '/documents?system=weekly']]) {
    const crumbs = crumbsUnder(crumbsOf(path), list, { label: '상세 제목' });
    assert.deepEqual(crumbs.map(c => c.label), ['문서함', name, '상세 제목']);
    assert.equal(crumbs[0].href, '/documents');
    assert.equal(crumbs[1].href, list);
  }
});
