import test from 'node:test';
import assert from 'node:assert/strict';
import {isTransientOfficialSourceFailure as check} from '../scripts/official-source-network-errors.mjs';
test('network timeout and denied IPv6 transport are non-certifying transient outages',()=>{
 const x=Object.assign(Error('fetch failed'),{cause:Object.assign(Error('connect failed'),{
  errors:[Object.assign(Error('connect ETIMEDOUT'),{code:'ETIMEDOUT'}),
   Object.assign(Error('connect ENETUNREACH'),{code:'ENETUNREACH'})]})});
 assert.equal(check(x),true);
});
test('temporary official service HTTP errors classify unavailable',()=>{
 for(const code of [429,500,502,503,504])assert.equal(check(Error('Plano official layer 1: HTTP '+code)),true);
});
test('data mismatch, bad shape, wrong year and nontransient 404 are hard failures',()=>{
 for(const message of ['Plano official Finder zone shape counts changed',
  'official feeder contradiction','Source response format changed',
  'Plano official layer 1: HTTP 404','Wrong academic year'])assert.equal(check(Error(message)),false);
});
test('unknown error is not automatically excused',()=>{
 assert.equal(check(null),false);
 assert.equal(check(Error('invalid data')),false);
});
