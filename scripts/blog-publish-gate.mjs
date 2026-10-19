import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const tokens = s => new Set((s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 3));
export const similarity = (a,b) => { const x=tokens(a),y=tokens(b); return [...x].filter(t=>y.has(t)).length / Math.max(1,Math.min(x.size,y.size)); };
export function validatePost(file,raw) {
 const failures=[];
 const front=raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
 const title=front?.[1].match(/^title:\s*(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g,'') || file;
 const excerpt=front?.[1].match(/^(?:excerpt|description):\s*(.+)$/m)?.[1];
 if(!excerpt) failures.push(file+': missing excerpt/description');
 if(/(?:sample|fake|fabricated) testimonial|mock (?:results|metrics)|guaranteed (?:results|revenue)|testimonial template|before\/after metrics|increase.{0,60}(?:engagement|conversions).{0,20}(?:20\s*%|20\s*percent)/i.test(raw)) failures.push(file+': unsupported marketing proof');
 if(/(?:\$80\s*(?:\/\s*(?:hour|hr)|per hour|hourly)|\$400.{0,60}(?:four|4).{0,25}hours)/i.test(raw)) failures.push(file+': conflicting service price');
 return {file,title,failures};
}
export function validateCatalog(posts) {
 const failures=posts.flatMap(p=>p.failures);
 for(let i=0;i<posts.length;i++) for(let j=0;j<i;j++) if(similarity(posts[i].title,posts[j].title)>=0.82) failures.push(posts[i].file+' duplicates title/topic of '+posts[j].file);
 return failures;
}
if(process.argv[1]?.endsWith('blog-publish-gate.mjs')) {
 const dir=join(process.cwd(),'content/blog');
 const posts=readdirSync(dir).filter(f=>f.endsWith('.md')).map(file=>validatePost(file,readFileSync(join(dir,file),'utf8')));
 const failures=validateCatalog(posts);
 if(failures.length){console.error('Content publishing gate FAILED:\n'+failures.join('\n'));process.exitCode=1;}
 else console.log('Content publishing gate passed: '+posts.length+' posts');
}
