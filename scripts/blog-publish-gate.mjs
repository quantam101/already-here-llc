import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'content/blog');
const files = readdirSync(dir).filter(f => f.endsWith('.md'));
const failures = [];
const tokens = s => new Set((s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 3));
const similarity = (a,b) => { const x=tokens(a),y=tokens(b); return [...x].filter(t=>y.has(t)).length / Math.max(1,Math.min(x.size,y.size)); };
const posts = files.map(file => {
  const raw=readFileSync(join(dir,file),'utf8');
  const front=raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const title=front?.[1].match(/^title:\s*(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g,'') || file;
  const excerpt=front?.[1].match(/^(?:excerpt|description):\s*(.+)$/m)?.[1];
  if(!excerpt) failures.push(file+': missing excerpt/description');
  if(/(?:sample|fake|fabricated) testimonial|mock (?:results|metrics)|guaranteed (?:results|revenue)/i.test(raw)) failures.push(file+': unsupported marketing proof');
  if(/(?:\$80\s*\/\s*(?:hour|hr)|\$400.{0,60}(?:four|4).{0,25}hours)/i.test(raw)) failures.push(file+': conflicting service price');
  return {file,title,raw};
});
for(let i=0;i<posts.length;i++) for(let j=0;j<i;j++){
  const a=posts[i],b=posts[j];
  if(similarity(a.title,b.title)>=0.82) failures.push(a.file+' duplicates title/topic of '+b.file);
}
if(failures.length){console.error('Content publishing gate FAILED:\n'+failures.join('\n'));process.exit(1);}
console.log('Content publishing gate passed: '+posts.length+' posts');
