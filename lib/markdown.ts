import { remark } from 'remark';
import html from 'remark-html';

/** Render Markdown and safe pipe tables without introducing an unpinned dependency. */
export async function renderMarkdown(markdown: string): Promise<string> {
  const blocks: string[] = [];
  const escaped = (s: string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const lines = markdown.split(/\r?\n/);
  const rewritten: string[] = [];
  for (let i=0;i<lines.length;) {
    const cells=(s:string)=>s.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
    const divider=(s:string)=>/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(s);
    if(i+1<lines.length && lines[i].includes('|') && divider(lines[i+1])) {
      const head=cells(lines[i]); i+=2; const rows:string[][]=[];
      while(i<lines.length && lines[i].includes('|') && lines[i].trim()) {rows.push(cells(lines[i]));i++;}
      const row=(arr:string[],tag:'th'|'td')=>'<tr>'+head.map((_,j)=>'<'+tag+'>'+escaped(arr[j]||'')+'</'+tag+'>').join('')+'</tr>';
      blocks.push('<table><thead>'+row(head,'th')+'</thead><tbody>'+rows.map(r=>row(r,'td')).join('')+'</tbody></table>');
      rewritten.push('BLOG_TABLE_TOKEN_'+(blocks.length-1)+'_END');
    } else {rewritten.push(lines[i]);i++;}
  }
  let output=(await remark().use(html,{sanitize:true}).process(rewritten.join('\n'))).toString();
  blocks.forEach((block,i)=>{output=output.replace('<p>BLOG_TABLE_TOKEN_'+i+'_END</p>',block);});
  return output;
}
