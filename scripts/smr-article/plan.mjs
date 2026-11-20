import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
export const targets={chateau:{repo:'vwcamper77/chateaumontfelix.com',origin:'https://www.chateaumontfelix.com',source:'content/blog-articles.js',route:s=>'/blog/'+s+'/'},guestsetgo:{repo:'vwcamper77/guestsetgo',origin:'https://www.guestsetgo.com',source:'lib/editorial.mjs',route:s=>'/blog/'+s},'set-the-date':{repo:'vwcamper77/set-the-date-website',origin:'https://setthedate.app',route:s=>'/'+s+'/'},snagsort:{repo:'vwcamper77/snagsort',origin:'https://www.snagsort.com',source:'data/blog/articles.json',route:s=>'/blog/'+s}};
const hash=s=>createHash('sha256').update(s).digest('hex');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function planRepositoryArticle(bundle,root) {
 const {site,article:a,native}=bundle,t=targets[site];
 if(!t||bundle.repository!==t.repo||!a||a.site!==site||!native||bundle.adapterError)throw Error('Invalid brand-specific native bundle.');
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug)||a.slug.length>120||a.canonicalUrl!==t.origin+t.route(a.slug))throw Error('Invalid native route or canonical.');
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(a.id)||!Number.isInteger(a.revision)||a.revision<1||!/^[a-f0-9]{64}$/.test(a.contentHash))throw Error('Invalid revision fingerprint.');
 const marker='smr-article:'+a.id+':'+a.revision+':'+a.contentHash;
 const record={...native.record,smrReleaseFingerprint:marker};
 const read=p=>readFile(resolve(root,p),'utf8'),files=[];
 const update=async(path,content)=>{let before=null;try{before=await read(path);}catch(e){if(e.code!=='ENOENT')throw e;}files.push({path,beforeSha256:before===null?null:hash(before),content});};
 if(site==='chateau'||site==='guestsetgo'){
  if(native.source!==t.source)throw Error('Unexpected native source.');
  const source=await read(t.source);
  if(source.includes(a.slug))throw Error('Article slug already exists in current native source.');
  if(site==='chateau'){
   const wp=[...JSON.parse(await read('content/main-wordpress.json')),...JSON.parse(await read('content/blog-wordpress.json'))];
   const collisions=new Set(['/'+a.slug,'/blog/'+a.slug,'/_blog/'+a.slug]);
   if(wp.some(p=>collisions.has(new URL(p.url).pathname.replace(/\/$/,''))))throw Error('Article route collides with a preserved page.');
   record.html+='\n<!-- '+marker+' -->';
  }
  const collection=site==='chateau'?'blogArticles':'articles';
  await update(t.source,source+'\n// Owner-approved article release.\n'+collection+'.push('+JSON.stringify(record,null,2)+');\n');
 }else if(site==='snagsort'){
  if(native.source!==t.source)throw Error('Unexpected native source.');
  const records=JSON.parse(await read(t.source));
  if(records.some(p=>p.slug===a.slug))throw Error('Article slug already exists.');
  await update(t.source,JSON.stringify([...records,record],null,2)+'\n');
 }else{
  const path='site/'+a.slug+'/index.html';
  if(native.source!==path)throw Error('Unexpected native page path.');
  try{await access(resolve(root,path));throw Error('Article route already exists.');}catch(e){if(e.code!=='ENOENT')throw e;}
  const index=JSON.parse(await read('site/content-index.json'));
  if(index.some(p=>p.path.replace(/\/$/,'')===t.route(a.slug).replace(/\/$/,'')))throw Error('Article route already exists.');
  await update(path,record.html+'\n<!-- '+marker+' -->\n');
  await update('site/content-index.json',JSON.stringify([...index,record.indexEntry],null,2)+'\n');
  const hub=await read('site/blog/index.html'),sitemap=await read('site/sitemap.xml');
  if(!hub.includes('</main>')||!sitemap.includes('</urlset>'))throw Error('Native listing or sitemap template changed.');
  await update('site/blog/index.html',hub.replace('</main>','<section><h2><a href="'+t.route(a.slug)+'">'+esc(a.title)+'</a></h2><p>'+esc(a.excerpt||a.seoDescription)+'</p></section></main>'));
  await update('site/sitemap.xml',sitemap.replace('</urlset>','<url><loc>'+a.canonicalUrl+'</loc></url></urlset>'));
 }
 return {site,marker,files};
}
