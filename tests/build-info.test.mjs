// #38: the app bar shows the build commit, stamped by the workflow, so same-version APKs can be told apart.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('the app bar shows the version and the build commit',async()=>{
 const {BUILD_SHA}=await import('../src/buildInfo.ts');assert.match(BUILD_SHA,/^(dev|[0-9a-f]{7,12})$/,'placeholder, or stamped by CI');
 assert.match(read('App.tsx'),/LIVE COCKPIT · [\d.]+ · \{BUILD_SHA\}/);
});
test('the build workflow stamps the short commit before building',()=>{
 const wf=read('.github/workflows/build-apk.yml');
 const stamp=wf.indexOf("open('src/buildInfo.ts','w')"),prebuild=wf.indexOf('expo prebuild');
 assert.ok(stamp>0&&prebuild>stamp,'stamped before the Android build');
 assert.ok(wf.includes("export const BUILD_SHA: string = 'dev';"),'checks the placeholder shape, so a change fails loudly');
 // In CI the file is already stamped by the time tests run; locally it is the placeholder the workflow expects.
 assert.match(read('src/buildInfo.ts'),/export const BUILD_SHA: string = '(dev|[0-9a-f]{7,12})';/);
});
