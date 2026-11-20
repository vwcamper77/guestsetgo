import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPageMetadata} from '../lib/seo.mjs';
test('approved release fingerprint is emitted only for the imported article',()=>{
 const doc={path:'/blog/private-test',title:'Private test',description:'Private fixture.'};
 assert.equal(publicPageMetadata(doc).other,undefined);
 const marker='smr-article:test:1:'+'a'.repeat(64);
 assert.equal(publicPageMetadata({...doc,smrReleaseFingerprint:marker}).other['smr-article'],marker);
});
