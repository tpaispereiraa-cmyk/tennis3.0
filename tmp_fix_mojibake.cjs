const fs = require('fs');
const paths = [
  'src/ui/universe/BroadcastUniverse.jsx',
  'src/ui/history/HallOfFameView.jsx',
  'src/ui/players/UnifiedPlayerProfile2.jsx',
  'src/ui/game/HomeScreen.jsx',
  'src/ui/game/MatchOverScreen.jsx'
];
function suspiciousScore(s){ const m = s.match(/[ÃÂâÅðï¿½]/g); return m ? m.length : 0; }
function fixToken(token){ let cur = token; for(let i=0;i<3;i++){ const dec = Buffer.from(cur, 'latin1').toString('utf8'); if (suspiciousScore(dec) < suspiciousScore(cur)) cur = dec; else break; } return cur; }
const tokenRe = /[ÃÂâÅð][^\n\r"'`<>]{1,180}/g;
for (const p of paths){ if(!fs.existsSync(p)) continue; const src = fs.readFileSync(p, 'utf8'); const out = src.replace(tokenRe, (t)=>fixToken(t)); if (out !== src){ fs.writeFileSync(p, out, 'utf8'); console.log('fixed', p); } else { console.log('nochange', p); } }
