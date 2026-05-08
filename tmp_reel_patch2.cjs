const fs = require('fs');
const path = 'C:/Users/tpais/OneDrive/AppData/Desktop/TENNIS.E2.0/src/components/UniverseManager.jsx';
let text = fs.readFileSync(path, 'latin1');

text = text.replace("console.group(`%c[HL-REEL] Modo ${modeLabel} — ${modeClips.length} clips selecionados`, 'color:#FFD700;font-weight:bold');", "console.group(`%c[HL-REEL] Modo ${modeLabel}`, 'color:#FFD700;font-weight:bold');");
text = text.replace("      `| clip ${clipIdx+1} de ${clips.length}`);", "      `| transmissao guiada`);");

const oldScoreBlock = `          {/* Score block — Sets prominent, games secondary */}
          <div style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:10,
            animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) .30s both',
          }}>
            {/* Set label */}
            <div style={{
              fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.3em',
              color:'rgba(255,255,255,.28)', textTransform:'uppercase',
            }}>
              {(clip.s0 + clip.s1 + 1)}º set
            </div>

            {/* Sets score — the big number */}
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                fontSize:'clamp(48px,7vw,80px)', lineHeight:1,
                color: clip.s0 >= clip.s1 ? '#F2EDE4' : 'rgba(255,255,255,.35)',
              }}>{clip.s0}</div>
              <div style={{
                fontFamily:"'Space Mono',monospace", fontSize:11,
                color:'rgba(255,255,255,.15)', letterSpacing:'.1em',
              }}>–</div>
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                fontSize:'clamp(48px,7vw,80px)', lineHeight:1,
                color: clip.s1 >= clip.s0 ? '#F2EDE4' : 'rgba(255,255,255,.35)',
              }}>{clip.s1}</div>
            </div>

            {/* Divider */}
            <div style={{ width:40, height:1, background:'rgba(255,255,255,.08)' }}/>

            {/* Games + points — secondary */}
            <div style={{
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
              fontSize:'clamp(14px,2vw,20px)', letterSpacing:'.1em',
              color:'rgba(255,255,255,.55)',
            }}>{clip.score}</div>
          </div>`;

const newScoreBlock = `          {mode === 'extended' ? (
            <div style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:10,
              animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) .30s both',
            }}>
              <div style={{
                fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.3em',
                color:'rgba(255,255,255,.28)', textTransform:'uppercase',
              }}>
                {(clip.s0 + clip.s1 + 1)}º set
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                <div style={{
                  fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                  fontSize:'clamp(48px,7vw,80px)', lineHeight:1,
                  color: clip.s0 >= clip.s1 ? '#F2EDE4' : 'rgba(255,255,255,.35)',
                }}>{clip.s0}</div>
                <div style={{
                  fontFamily:"'Space Mono',monospace", fontSize:11,
                  color:'rgba(255,255,255,.15)', letterSpacing:'.1em',
                }}>–</div>
                <div style={{
                  fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                  fontSize:'clamp(48px,7vw,80px)', lineHeight:1,
                  color: clip.s1 >= clip.s0 ? '#F2EDE4' : 'rgba(255,255,255,.35)',
                }}>{clip.s1}</div>
              </div>
              <div style={{ width:40, height:1, background:'rgba(255,255,255,.08)' }}/>
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
                fontSize:'clamp(14px,2vw,20px)', letterSpacing:'.1em',
                color:'rgba(255,255,255,.55)',
              }}>{clip.score}</div>
            </div>
          ) : (
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
          )}`;

if (text.includes(oldScoreBlock)) {
  text = text.replace(oldScoreBlock, newScoreBlock);
}

fs.writeFileSync(path, text, 'latin1');
