// #6: the compact bridge key bar fits every visible key, each at least 44 px, in both orientations.
import test from 'node:test';import assert from 'node:assert/strict';
import {navLayoutCss} from '../src/navLayoutPatch.ts';
test('compact bridge keys: one row in portrait, two rows of >=44px keys in landscape',()=>{
 assert.match(navLayoutCss,/\[data-bridge=compact\] \.flight-actions\{display:grid;grid-auto-flow:column;grid-auto-columns:minmax\(0,1fr\)/,'portrait: one row, as many columns as visible keys');
 const land=/@media \(orientation: landscape\) and \(max-height: 600px\)\{([\s\S]*?)\n\}/.exec(navLayoutCss);assert.ok(land,'landscape rule');
 assert.match(land[1],/grid-template-columns:repeat\(4,minmax\(44px,1fr\)\)/,'landscape: four columns, wraps to a second row');
 assert.match(land[1],/min-height:44px;min-width:44px/,'touch targets at least 44 px');
 assert.match(navLayoutCss,/@media \(orientation: portrait\) and \(max-width: 400px\)\{[^}]*letter-spacing:\.02em/,'narrow portrait: labels fit their keys');
});
