const fs = require('fs');
const p = 'src/ui/universe/BroadcastUniverse.jsx';
let src = fs.readFileSync(p,'utf8');
function score(s){return (s.match(/[ÃÂâÅðï¿½]/g)||[]).length}
function fix(tok){let c=tok; for(let i=0;i<3;i++){const d=Buffer.from(c,'latin1').toString('utf8'); if(score(d)<score(c)) c=d; else break;} return c;}
src = src.replace(/[ÃÂâÅð][^\n\r"'`<>]{1,180}/g, m=>fix(m));
src = src.replace(/\uFFFD/g,'');
fs.writeFileSync(p,src,'utf8');
console.log('done');
