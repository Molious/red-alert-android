import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('Android game document stays under the small-bundle budget and reports boot status',()=>{
 const source=readFileSync(new URL('../src/hybridHtml.ts',import.meta.url),'utf8');
 const html=JSON.parse(source.replace(/^export default /,'').trim().replace(/;$/,''));
 assert.ok(Buffer.byteLength(html)<4*1024*1024,'Embedded HTML must stay below 4 MiB');
 assert.match(html,/hybrid-boot-v1/);assert.match(html,/addEventListener\('error'/);assert.match(html,/unhandledrejection/);
});
