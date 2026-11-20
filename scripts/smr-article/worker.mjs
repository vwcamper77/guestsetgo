// Runs only in the brand's main-branch GitHub Actions workflow.
// No hosting upload, deployment API, local-output commit or long-lived SMR key.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {planRepositoryArticle,targets} from './plan.mjs';
const site=process.env.ARTICLE_SITE,target=targets[site],mode=process.argv[2]||'run';
const api='https://www.socialmediareminder.com/api/content/repository-worker';
if(!target||process.env.GITHUB_REPOSITORY!==target.repo||process.env.GITHUB_REF!=='refs/heads/main'||!['verify','run'].includes(mode))throw Error('Worker requires its mapped repository, main branch and a valid mode.');
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
let cached;
async function oidc(){
 if(cached?.until>Date.now())return cached.token;
 const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',api);
 const r=await fetch(url,{headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('GitHub workload identity unavailable.');
 const {value}=await r.json();console.log('::add-mask::'+value);cached={token:value,until:Date.now()+120000};return value;
}
async function central(body,cursor=''){
 const r=await fetch(api+'?'+new URLSearchParams({site,...(cursor?{cursor}:{})}),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+await oidc(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});
 const v=await r.json();if(!r.ok)throw Error('SMR worker HTTP '+r.status+': '+(v.error||'Request failed.'));return v;
}
async function github(path,method='GET',body){
 const r=await fetch('https://api.github.com/repos/'+target.repo+path,{method,headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 const v=r.status===204?null:await r.json();if(!r.ok)throw Error('GitHub HTTP '+r.status+' for '+path.split('?')[0]);return v;
}
const childEnv=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(k)));
function command(program,args){return execFileSync(program,args,{encoding:'utf8',stdio:'pipe',env:childEnv,maxBuffer:30*1024*1024});}
async function validate(plan){
 for(const f of plan.files){await mkdir(dirname(resolve(f.path)),{recursive:true});await writeFile(f.path,f.content);}
 // Only reviewed project code runs. Article text is data; never a shell argument.
 command('npm',['ci','--no-audit','--no-fund']);
 command('npm',['run','build']);
 command('npm',site==='snagsort'?['run','test:marketing']:['test']);
 console.log('Native project tests and build passed for '+site+'.');
}
async function waitForChecks(sha){
 for(let n=0;n<60;n++){
  const [combined,runs]=await Promise.all([github('/commits/'+sha+'/status'),github('/commits/'+sha+'/check-runs')]);
  const checks=runs.check_runs||[],statuses=combined.statuses||[];
  if(statuses.some(s=>['failure','error'].includes(s.state))||checks.some(c=>c.status==='completed'&&!['success','neutral','skipped'].includes(c.conclusion)))throw Error('A GitHub or Vercel release check failed.');
  if(statuses.some(s=>s.context==='Vercel'&&s.state==='success')&&combined.state==='success'&&checks.every(c=>c.status==='completed'))return;
  await delay(10000);
 }
 throw Error('GitHub/Vercel checks are still pending. The next run resumes this PR.');
}
async function requireReviewReady(number){
 const [owner,name]=target.repo.split('/');
 const response=await fetch('https://api.github.com/graphql',{method:'POST',headers:{Authorization:'Bearer '+process.env.GH_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({query:'query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){nodes{isResolved}pageInfo{hasNextPage}}reviews(last:100){nodes{state author{login}}}}}}',variables:{owner,name,number}}),signal:AbortSignal.timeout(30000)});
 const v=await response.json(),pr=v.data?.repository?.pullRequest;
 if(!response.ok||v.errors||!pr)throw Error('GitHub review state could not be verified.');
 if(pr.reviewThreads.pageInfo.hasNextPage||pr.reviewThreads.nodes.some(t=>!t.isResolved))throw Error('The article PR has unresolved review comments.');
 const latest=new Map(pr.reviews.nodes.map(r=>[r.author?.login,r.state]));
 if([...latest.values()].includes('CHANGES_REQUESTED'))throw Error('The article PR requires review changes.');
}
async function run(){
 if(mode==='verify'){
  const missing=await fetch(api+'?site='+site);
  const other=site==='snagsort'?'guestsetgo':'snagsort';
  const denied=await fetch(api+'?site='+other,{headers:{Authorization:'Bearer '+await oidc()}});
  if(missing.status!==401||denied.status!==403)throw Error('Worker authentication or brand isolation failed.');
  const probe=await central({action:'probe'});if(!probe.probe||probe.article.status!=='draft')throw Error('Expected a private worker probe.');
  const plan=await planRepositoryArticle(probe,process.cwd());await validate(plan);
  console.log(JSON.stringify({site,verified:true,oidc:true,unauthenticated:missing.status,crossBrand:denied.status,nativeFiles:plan.files.map(f=>f.path),tests:'passed',build:'passed',remoteWrites:false,published:false}));return;
 }
 let cursor='',job;
 do{const page=await central(null,cursor);job=page.jobs?.[0];cursor=page.nextCursor||'';}while(!job&&cursor);
 if(!job){console.log(JSON.stringify({site,queued:0,published:false}));return;}
 const args={articleId:job.id,revision:job.revision};
 const bundle=await central({action:'claim',...args}),branch=bundle.article.release.branch;
 try{
  let pr=(await github('/pulls?'+new URLSearchParams({state:'all',head:target.repo.split('/')[0]+':'+branch}))).find(p=>p.head.ref===branch);
  if(pr?.state==='closed'&&!pr.merged_at){await central({action:'cancelled',...args});console.log('Closed PR reconciled; the article is a private draft again.');return;}
  if(!pr){
   const plan=await planRepositoryArticle(bundle,process.cwd());await validate(plan);
   const base=await github('/git/ref/heads/main'),commit=await github('/git/commits/'+base.object.sha);
   if(command('git',['rev-parse','HEAD']).trim()!==base.object.sha)throw Error('Main changed during validation. Retry from the current main branch.');
   const tree=await github('/git/trees','POST',{base_tree:commit.tree.sha,tree:plan.files.map(f=>({path:f.path,mode:'100644',type:'blob',content:f.content}))});
   const next=await github('/git/commits','POST',{message:'Publish owner-approved article: '+bundle.article.title,tree:tree.sha,parents:[base.object.sha]});
   let existing;try{existing=await github('/git/ref/heads/'+branch);}catch(e){if(!e.message.includes('HTTP 404'))throw e;}
   if(existing){
    const diff=await github('/compare/'+base.object.sha+'...'+existing.object.sha);
    if(diff.files.length!==plan.files.length)throw Error('Existing release branch needs review.');
    for(const f of plan.files){const saved=await github('/contents/'+f.path+'?ref='+encodeURIComponent(branch));if(Buffer.from(saved.content,'base64').toString('utf8')!==f.content)throw Error('Existing release branch differs from approved content.');}
   }else await github('/git/refs','POST',{ref:'refs/heads/'+branch,sha:next.sha});
   pr=await github('/pulls','POST',{base:'main',head:branch,title:'Publish article: '+bundle.article.title,body:'Owner approved revision '+job.revision+' of article '+job.id+' through SMR. Native tests and build passed. This PR changes source content only; Vercel deploys through GitHub.\n\nArticle: '+bundle.article.canonicalUrl});
  }
  await central({action:'record',...args,prUrl:pr.html_url});
  if(!pr.merged_at){
   // Reconcile a moved main without rewriting branch history.
   const main=await github('/git/ref/heads/main');
   const comparison=await github('/compare/'+main.object.sha+'...'+pr.head.sha);
   if(!['ahead','identical'].includes(comparison.status)){
    await github('/merges','POST',{base:branch,head:'main',commit_message:'Merge current main before approved article release'});
    throw Error('Main advanced; review the refreshed preview before merging this article PR.');
   }
   command('git',['fetch','origin',branch]);
   command('git',['checkout','--detach','FETCH_HEAD']);
   // Resumed PRs are built again against their actual head.
   await validate({files:[]});
   await waitForChecks(pr.head.sha);
   await requireReviewReady(pr.number);
   if((await github('/git/ref/heads/main')).object.sha!==main.object.sha)throw Error('Main changed after validation. The next run reconciles the release.');
   await central({action:'authorize',...args});
   const merge=await github('/pulls/'+pr.number+'/merge','PUT',{sha:pr.head.sha,merge_method:'squash'});
   if(!merge.merged)throw Error('GitHub review or merge policy is still pending.');
   pr=await github('/pulls/'+pr.number);
  }
  for(let attempt=0;attempt<40;attempt++){
   try{await central({action:'complete',...args,commit:pr.merge_commit_sha});console.log(JSON.stringify({site,articleId:job.id,status:'published',pr:pr.html_url,commit:pr.merge_commit_sha}));return;}catch(e){if(!e.message.includes('HTTP 409'))throw e;if(attempt===39)throw e;await delay(10000);}
  }
 }catch(error){await central({action:'failed',...args}).catch(()=>{});throw error;}
}
await run();
