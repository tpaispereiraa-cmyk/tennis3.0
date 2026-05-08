const fs = require('fs');
const path = 'C:/Users/tpais/OneDrive/AppData/Desktop/TENNIS.E2.0/src/components/UniverseManager.jsx';
let text = fs.readFileSync(path, 'latin1');
text = text.replace(
`          <div style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:10,
            animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) .30s both',
          }}>`,
`          <div style={{
            display: mode === 'extended' ? 'flex' : 'none', flexDirection:'column', alignItems:'center', gap:10,
            animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) .30s both',
          }}>`
);
text = text.replace(
`          {/* Rally length badge (only for rally clips) */}`,
`          {mode !== 'extended' && (
            <div style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:10,
              animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) .30s both',
            }}>
              <div style={{
                fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.3em',
                color:'rgba(255,255,255,.28)', textTransform:'uppercase',
              }}>
                {modeMeta.title}
              </div>
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                fontSize:'clamp(24px,4vw,40px)', lineHeight:1,
                color:'#F2EDE4', letterSpacing:'.08em', textTransform:'uppercase'
              }}>
                {['MATCH_POINT', 'FINAL_POINT'].includes(clip.type)
                  ? 'DECISAO NO AR'
                  : ['SET_POINT', 'TIEBREAK_CRITICAL', 'BREAK_POINT'].includes(clip.type)
                    ? 'PRESSAO MAXIMA'
                    : clip.rallyLength >= 10
                      ? 'TROCA ESTENDIDA'
                      : 'CAPITULO DA PARTIDA'}
              </div>
              <div style={{ width:44, height:1, background:'rgba(255,255,255,.08)' }}/>
              <div style={{
                fontFamily:"'Barlow',sans-serif", fontWeight:500,
                fontSize:'clamp(13px,1.8vw,18px)', letterSpacing:'.04em',
                color:'rgba(255,255,255,.52)', maxWidth:420,
              }}>
                {mode === 'compact'
                  ? 'So o trecho que realmente mexeu com a partida.'
                  : 'Um capitulo selecionado para contar a historia sem denunciar o tamanho do jogo.'}
              </div>
            </div>
          )}

          {/* Rally length badge (only for rally clips) */}`
);
fs.writeFileSync(path, text, 'latin1');
