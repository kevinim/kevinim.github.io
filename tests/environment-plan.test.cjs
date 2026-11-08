'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {validate}=require('../scripts/validate-environment-plan.cjs');
const original=JSON.parse(fs.readFileSync('deploy/environment-plan.json','utf8'));
const clone=()=>JSON.parse(JSON.stringify(original));
test('default plan is safe and has zero active deployment settings',()=>{
 const result=validate(clone());
 assert.equal(result.gatewayHost,'kevinim.github.io');
 assert.equal(result.uatHost,null);
 assert.equal(result.prodHost,null);
 assert.equal(result.cutoverReady,false);
 assert.equal(original.familyEntry.deployEnabled,false);
 assert.equal(original.familyUat.deployEnabled,false);
 assert.equal(original.publicProduction.deployEnabled,false);
});
test('cannot use the public gateway origin for production or UAT',()=>{
 const p=clone();p.publicProduction.origin='https://kevinim.github.io/';
 assert.throws(()=>validate(p),/separate origin/);
 p.publicProduction.origin='https://family-uat.pages.dev/';
 p.familyUat.origin='https://family-uat.pages.dev/';
 assert.throws(()=>validate(p),/separate origin/);
});
test('cannot treat github.io as an Access-protected UAT host',()=>{
 const p=clone();p.familyUat.origin='https://kevinim.github.io/';
 assert.throws(()=>validate(p),/Cloudflare Pages origin/);
});
test('UAT and production origin cannot contain redirects, token queries, or credentials',()=>{
 const p=clone();
 p.familyUat.origin='https://family-uat.pages.dev/?token=secret';
 assert.throws(()=>validate(p),/origin only/);
 p.familyUat.origin='https://family-uat.pages.dev/';
 p.publicProduction.origin='https://attacker@prod.example.com/';
 assert.throws(()=>validate(p),/origin only/);
});
test('cutover is blocked until private source and both authentication edges are verified',()=>{
 const p=clone();p.familyUat.origin='https://family-uat.pages.dev/';
 p.publicProduction.origin='https://dfw-public.pages.dev/';
 assert.throws(()=>validate(p,{cutover:true}),/private source/);
 p.familyUat.privateSourceRepository='PRIVATE_SOURCE_NOT_CREATED';
 assert.throws(()=>validate(p,{cutover:true}),/primary hostname Access policy/);
 p.familyUat.primaryHostProtected=true;
 assert.throws(()=>validate(p,{cutover:true}),/preview alias Access policy/);
});
test('future approved plan can pass pure validation but never invokes deployment',()=>{
 const p=clone();p.familyUat.origin='https://family-uat.pages.dev/';
 p.publicProduction.origin='https://dfw-production.pages.dev/';
 p.familyUat.privateSourceRepository='private-owner/private-repo';
 p.familyUat.primaryHostProtected=true;
 p.familyUat.previewAliasesProtected=true;
 p.familyUat.anonymousTestPassed=true;
 p.publicProduction.redistributionApproved=true;
 p.release.ownerApproved=true;
 p.release.backupAndRollbackTested=true;
 p.release.deployWorkflowConfigured=true;
 assert.equal(validate(p,{cutover:true}).cutoverReady,true);
});
