// ============================================
// BATTLE STATE
// Gerenciamento de estado da batalha
// ============================================

/**
 * Cria estado inicial da batalha
 */
export function createInitialBattleState(bey1, bey2) {
  return {
    stamina1: 100,
    stamina2: 100,
    spin1: 100,
    spin2: 100,
    stability1: 100,
    stability2: 100,
    time: 0,
    bey1Combos: 0,
    bey2Combos: 0,
    hits1: 0,
    hits2: 0,
    winner: null,
    winType: null,
    finished: false
  };
}

/**
 * Atualiza estado da batalha
 */
export function updateBattleState(state, b1, b2, deltaTime = 1/60) {
  // Update time
  state.time += deltaTime;
  
  // Update spin percentages
  const stats1 = b1.bey.effectiveStats || b1.bey.stats;
  const stats2 = b2.bey.effectiveStats || b2.bey.stats;
  
  state.spin1 = Math.max(0, Math.min(100, (b1.spinSpeed / (stats1.spin || 35)) * 100));
  state.spin2 = Math.max(0, Math.min(100, (b2.spinSpeed / (stats2.spin || 35)) * 100));
  
  // Update stability
  state.stability1 = Math.max(0, Math.min(100, b1.stability || 100));
  state.stability2 = Math.max(0, Math.min(100, b2.stability || 100));
  
  // Stamina decreases with spin loss
  state.stamina1 = Math.max(0, state.spin1);
  state.stamina2 = Math.max(0, state.spin2);
  
  return state;
}

/**
 * Registra hit/combo
 */
export function registerHit(state, attackerId) {
  if (attackerId === 1) {
    state.hits1++;
    state.bey1Combos++;
    state.bey2Combos = 0;
  } else if (attackerId === 2) {
    state.hits2++;
    state.bey2Combos++;
    state.bey1Combos = 0;
  }
  
  return state;
}

/**
 * Verifica condições de vitória
 */
export function checkWinConditions(state, b1, b2, arenaRadius, centerX, centerY) {
  // Burst finish (spin = 0)
  if (b1.spinSpeed <= 0.5 && state.spin1 <= 1) {
    state.winner = 2;
    state.winType = 'Burst Finish';
    state.finished = true;
    return state;
  }
  
  if (b2.spinSpeed <= 0.5 && state.spin2 <= 1) {
    state.winner = 1;
    state.winType = 'Burst Finish';
    state.finished = true;
    return state;
  }
  
  // Ring out (fora da arena)
  const dist1 = Math.sqrt((b1.x - centerX) ** 2 + (b1.y - centerY) ** 2);
  const dist2 = Math.sqrt((b2.x - centerX) ** 2 + (b2.y - centerY) ** 2);
  
  if (dist1 > arenaRadius + 30) {
    state.winner = 2;
    state.winType = 'Ring Out';
    state.finished = true;
    return state;
  }
  
  if (dist2 > arenaRadius + 30) {
    state.winner = 1;
    state.winType = 'Ring Out';
    state.finished = true;
    return state;
  }
  
  // Time limit (2 minutes = 120 seconds)
  if (state.time > 120) {
    // Winner is who has more spin
    if (state.spin1 > state.spin2) {
      state.winner = 1;
      state.winType = 'Spin Finish';
    } else if (state.spin2 > state.spin1) {
      state.winner = 2;
      state.winType = 'Spin Finish';
    } else {
      state.winner = state.hits1 > state.hits2 ? 1 : 2;
      state.winType = 'Judge Decision';
    }
    state.finished = true;
    return state;
  }
  
  return state;
}

/**
 * Cria estado de arena com efeitos especiais
 */
export function createArenaState(arenaType) {
  const base = {
    type: arenaType,
    time: 0,
    lavaFlows: [],
    platforms: [],
    bumpers: [],
    zones: [],
    boostPads: [],
    currentWave: null,
    windActive: false,
    rainActive: false,
    wind: { angle: 0, force: 0 },
  };

  // Estado específico da Volcanic Rage
  if (arenaType === 'VOLCANIC_RAGE') {
    base.heat            = 0;          // Heat Meter 0–100
    base.eruptionActive  = false;
    base.eruptionStartTime = 0;
    base.lavaBombs       = [];
    base.lavaFlowPatterns = [];
    base.lastFlowChange  = -2.0;       // primeiro flow no segundo 2
    base.fissureOpen     = false;      // abre após 3s
  }

  // Estado específico da Tidal Surge (complementa tideSystem da config)
  if (arenaType === 'TIDAL_SURGE') {
    base.tideInitialized = false;
  }

  return base;
}

/**
 * Atualiza estado de arena com efeitos especiais
 */
export function updateArenaState(arenaState, deltaTime = 1/60, arenaConfig = null) {
  arenaState.time += deltaTime;
  
  // Se não tem config, retorna (arenas simples)
  if (!arenaConfig) return arenaState;
  
  // ============================================
  // COLOSSEUM_CARNAGE — Sistema de Eventos (Redesign)
  // Aos 3s sorteia 1 de 8 eventos com probabilidade igual (12.5% cada)
  // ============================================
  if (arenaConfig.carnageEvent) {
    const ce = arenaConfig.carnageEvent;
    const currentTime = arenaState.time;

    // ── Revelação do evento aos 3s ──────────────────────────────────
    if (!ce.revealed && currentTime >= ce.revealTime) {
      ce.revealed    = true;
      const idx      = Math.floor(Math.random() * ce.events.length);
      ce.activeEvent = ce.events[idx];

      // Inicializações por evento
      if (ce.activeEvent === 'PHANTOM_PAIR') {
        const wA = arenaConfig.zones.wallA;
        ce.phantomBlades = [
          { x: -(wA - 20), y: 0, vx: 6, vy: 1.5, radius: 18, hp: 80, alive: true, type: 'phantom' },
          { x:  (wA - 20), y: 0, vx: -6, vy: -1.5, radius: 18, hp: 80, alive: true, type: 'phantom' },
        ];
        arenaConfig.gates.A.open = true;
        arenaConfig.gates.B.open = true;
      }

      if (ce.activeEvent === 'THE_CHAMPION') {
        const wA = arenaConfig.zones.wallA;
        ce.championBlade = { x: -(wA - 30), y: 0, vx: 14, vy: 0, radius: 36, hp: 200, alive: true, type: 'champion' };
        arenaConfig.gates.A.open = true;
      }

      if (ce.activeEvent === 'THE_EXECUTIONER') {
        ce.executioner.currentA = arenaConfig.zones.wallA;
        ce.executioner.phase    = 0;
        ce.executioner.animating = false;
      }

      if (ce.activeEvent === 'DIVINE_JUDGMENT') {
        ce.divine.nextStrikeTimer = 4.0; // primeiro raio 4s após reveal
        ce.divine.strikes  = [];
        ce.divine.warnings = [];
      }

      if (ce.activeEvent === 'SANDSTORM') {
        ce.sandstorm.timer     = 0;
        ce.sandstorm.direction = 1;
      }
    }

    // ── Atualização contínua de eventos ────────────────────────────
    if (ce.revealed && ce.activeEvent) {
      const dt = deltaTime;
      const timeSinceReveal = currentTime - ce.revealTime;

      // PHANTOM_PAIR — move os peões fantasma
      if (ce.activeEvent === 'PHANTOM_PAIR') {
        ce.phantomBlades.forEach(ph => {
          if (!ph.alive) return;
          ph.x += ph.vx * dt;
          ph.y += ph.vy * dt;
          // Quica nas paredes
          const wA = arenaConfig.zones.wallA, wB = arenaConfig.zones.wallB;
          if (Math.abs(ph.x) > wA - ph.radius) { ph.vx *= -0.9; ph.x = Math.sign(ph.x) * (wA - ph.radius); }
          if (Math.abs(ph.y) > wB - ph.radius) { ph.vy *= -0.9; ph.y = Math.sign(ph.y) * (wB - ph.radius); }
        });
        // Fecha portões após 1s
        if (timeSinceReveal > 1.0) {
          arenaConfig.gates.A.open = false;
          arenaConfig.gates.B.open = false;
        }
      }

      // THE_CHAMPION — move o peão campeão
      if (ce.activeEvent === 'THE_CHAMPION' && ce.championBlade && ce.championBlade.alive) {
        const ch = ce.championBlade;
        ch.x += ch.vx * dt;
        ch.y += ch.vy * dt;
        const wA = arenaConfig.zones.wallA, wB = arenaConfig.zones.wallB;
        const px = ch.x, py = ch.y;
        const fA = (ch.radius + 4), fB = (ch.radius + 4);
        const ovalVal = (px / (wA - fA)) ** 2 + (py / (wB - fB)) ** 2;
        if (ovalVal >= 1) {
          const nX = px / ((wA - fA) ** 2), nY = py / ((wB - fB) ** 2);
          const nL = Math.sqrt(nX * nX + nY * nY);
          const nx = nX / nL, ny = nY / nL;
          const dot = ch.vx * nx + ch.vy * ny;
          ch.vx -= 2 * dot * nx; ch.vy -= 2 * dot * ny;
          ch.vx *= 0.85; ch.vy *= 0.85;
          const t = 1 / Math.sqrt(ovalVal);
          ch.x = px * t; ch.y = py * t;
        }
        if (timeSinceReveal > 1.0) arenaConfig.gates.A.open = false;
      }

      // SANDSTORM — atualiza direção
      if (ce.activeEvent === 'SANDSTORM') {
        ce.sandstorm.timer += dt;
        if (ce.sandstorm.timer >= ce.sandstorm.switchInterval) {
          ce.sandstorm.timer = 0;
          ce.sandstorm.direction *= -1;
        }
      }

      // THE_EXECUTIONER — compressões progressivas
      if (ce.activeEvent === 'THE_EXECUTIONER') {
        const ex = ce.executioner;
        if (ex.phase === 0 && timeSinceReveal >= ex.firstAt && !ex.animating) {
          ex.animating = true; ex.animTimer = 0;
          ex.startA = ex.currentA; ex.targetA = ex.firstTargetA;
        }
        if (ex.phase === 1 && timeSinceReveal >= ex.secondAt && !ex.animating) {
          ex.animating = true; ex.animTimer = 0;
          ex.startA = ex.currentA; ex.targetA = ex.secondTargetA;
        }
        if (ex.animating) {
          ex.animTimer += dt;
          const progress = Math.min(1, ex.animTimer / ex.animDuration);
          // Easing cúbica
          const ease = 1 - Math.pow(1 - progress, 3);
          ex.currentA = ex.startA + (ex.targetA - ex.startA) * ease;
          if (progress >= 1) {
            ex.animating = false;
            ex.currentA  = ex.targetA;
            ex.phase     = Math.min(2, ex.phase + 1);
          }
        }
      }

      // DIVINE_JUDGMENT — spawna avisos e raios
      if (ce.activeEvent === 'DIVINE_JUDGMENT') {
        const div = ce.divine;
        div.nextStrikeTimer -= dt;

        // Aviso visual 0.8s antes
        if (div.nextStrikeTimer <= div.warningDuration && div.nextStrikeTimer > 0 && div.warnings.length === 0) {
          const wA = arenaConfig.zones.wallA * 0.8;
          const wB = arenaConfig.zones.wallB * 0.8;
          const ang = Math.random() * Math.PI * 2;
          const r   = Math.random() * 0.85;
          div.warnings.push({
            x: Math.cos(ang) * wA * r,
            y: Math.sin(ang) * wB * r,
            age: 0,
          });
        }

        // Raio cai
        if (div.nextStrikeTimer <= 0) {
          const w = div.warnings[0];
          if (w) {
            const effectIdx = Math.floor(Math.random() * div.effects.length);
            const colors = {
              SPIN_BOOST: '#00ff88', SPIN_DRAIN: '#ff4400', STAMINA_BOOST: '#00ccff',
              STAMINA_DRAIN: '#cc0000', KNOCKBACK: '#ffaa00', INVISIBILITY: '#aaaaff',
              SHIELD: '#4488ff', CHAOS: '#ff00ff',
            };
            div.strikes.push({ x: w.x, y: w.y, age: 0, effect: div.effects[effectIdx], radius: 32, color: colors[div.effects[effectIdx]] || '#ffffff' });
            div.warnings = [];
          }
          div.nextStrikeTimer = div.strikeInterval;
        }

        // Envelhecimento/remoção
        div.warnings.forEach(w => { w.age += dt; });
        div.warnings = div.warnings.filter(w => w.age < div.warningDuration + 0.1);
        div.strikes.forEach(s => { s.age += dt; });
        div.strikes  = div.strikes.filter(s => s.age < 1.5);
      }
    }
  }

  // ============================================
  // COLOSSEUM_CARNAGE — Floor Sink (mecânica permanente)
  // A cada 5s: afunda 1s (funil) → sobe 1s → plano 5s → repete
  // ============================================
  if (arenaConfig.floorSink) {
    const fs = arenaConfig.floorSink;

    switch (fs.phase) {
      case 'flat':
        fs.idleTimer += deltaTime;
        if (fs.idleTimer >= fs.interval) {
          fs.idleTimer = 0;
          fs.timer     = 0;
          fs.phase     = 'sinking';
        }
        break;

      case 'sinking':
        fs.timer += deltaTime;
        // Easing: começa devagar, acelera — como areia cedendo
        const sinkProgress = Math.min(1, fs.timer / fs.sinkDuration);
        fs.depth = sinkProgress < 0.5
          ? 2 * sinkProgress * sinkProgress
          : 1 - Math.pow(-2 * sinkProgress + 2, 2) / 2;
        if (fs.timer >= fs.sinkDuration) {
          fs.depth = 1.0;
          fs.timer = 0;
          fs.phase = 'rising';
        }
        break;

      case 'rising':
        fs.timer += deltaTime;
        const riseProgress = Math.min(1, fs.timer / fs.riseDuration);
        // Easing: sobe com aceleração inicial e desaceleração suave
        fs.depth = 1.0 - (riseProgress < 0.5
          ? 2 * riseProgress * riseProgress
          : 1 - Math.pow(-2 * riseProgress + 2, 2) / 2);
        if (fs.timer >= fs.riseDuration) {
          fs.depth = 0.0;
          fs.timer = 0;
          fs.phase = 'flat';
        }
        break;
    }
  }
  
  // ============================================
  // STORM_TRACK - Storm System
  // ============================================
  if (arenaConfig.stormSystem) {
    const stormSystem = arenaConfig.stormSystem;
    const timing = stormSystem.timing;
    const currentTime = arenaState.time;
    
    // Calcula tempo desde início da fase atual
    const timeSincePhaseStart = currentTime - timing.phaseStartTime;
    
    // Máquina de estados do storm
    switch (timing.currentPhase) {
      case 'peace':
        // Período de paz entre storms
        if (timeSincePhaseStart >= timing.peaceDuration) {
          // Seleciona próximo storm
          if (!stormSystem.currentStorm) {
            const rand = Math.random();
            let cumulativeChance = 0;
            
            for (const [stormName, stormData] of Object.entries(stormSystem.stormTypes)) {
              cumulativeChance += stormData.chance;
              if (rand < cumulativeChance) {
                stormSystem.currentStorm = stormName;
                
                // Inicializa dados específicos do storm
                switch (stormName) {
                  case 'LIGHTNING_STORM':
                    stormData.currentStrikes = 0;
                    stormData.strikes = [];
                    stormData.lastStrikeTime = 0;
                    break;
                  case 'WIND_VORTEX':
                    stormData.vortices = [];
                    // Cria vórtices em posições aleatórias
                    for (let i = 0; i < stormData.vortexCount; i++) {
                      const angle = Math.random() * Math.PI * 2;
                      const radius = 80 + Math.random() * 60;
                      stormData.vortices.push({
                        x: Math.cos(angle) * radius,
                        y: Math.sin(angle) * radius,
                        angle: 0
                      });
                    }
                    break;
                  case 'HAIL_BARRAGE':
                    stormData.hailstones = [];
                    stormData.lastSpawnTime = 0;
                    break;
                  case 'TORNADO_FURY':
                    stormData.liftedBlades = [];
                    // Posição central do tornado
                    stormData.tornadoX = 0;
                    stormData.tornadoY = 0;
                    break;
                  case 'RAIN_WAVE':
                    stormData.waveDirection = Math.random() * Math.PI * 2;
                    stormData.currentWave = 0;
                    break;
                  case 'THUNDER_DOME':
                    stormData.lastTickTime = 0;
                    break;
                }
                
                break;
              }
            }
          }
          
          // Muda para fase de aviso
          timing.currentPhase = 'warning';
          timing.phaseStartTime = currentTime;
        }
        break;
        
      case 'warning':
        // Período de aviso antes do storm
        if (timeSincePhaseStart >= timing.warningDuration) {
          // Ativa o storm
          timing.currentPhase = 'active';
          timing.phaseStartTime = currentTime;
        }
        break;
        
      case 'active':
        // Storm está ativo
        if (timeSincePhaseStart >= timing.stormDuration) {
          // Storm terminou, volta para paz
          timing.currentPhase = 'peace';
          timing.phaseStartTime = currentTime;
          stormSystem.currentStorm = null;
        } else {
          // Atualiza efeitos do storm ativo
          if (stormSystem.currentStorm) {
            const activeStorm = stormSystem.stormTypes[stormSystem.currentStorm];
            
            switch (stormSystem.currentStorm) {
              case 'LIGHTNING_STORM':
                // Gera raios em intervalos
                if (timeSincePhaseStart - activeStorm.lastStrikeTime >= activeStorm.strikeInterval) {
                  if (activeStorm.currentStrikes < activeStorm.strikeCount) {
                    // Gera posição aleatória para o raio
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * 180; // Raio máximo da arena
                    
                    activeStorm.strikes.push({
                      x: Math.cos(angle) * radius,
                      y: Math.sin(angle) * radius,
                      radius: activeStorm.strikeRadius,
                      time: currentTime
                    });
                    
                    activeStorm.currentStrikes++;
                    activeStorm.lastStrikeTime = timeSincePhaseStart;
                  }
                }
                
                // Remove raios antigos (após 1 segundo)
                activeStorm.strikes = activeStorm.strikes.filter(strike => 
                  currentTime - strike.time < 1.0
                );
                break;
                
              case 'WIND_VORTEX':
                // Rotaciona os vórtices
                activeStorm.vortices.forEach(vortex => {
                  vortex.angle += activeStorm.rotationSpeed * deltaTime;
                });
                break;
                
              case 'HAIL_BARRAGE':
                // Spawna granizo
                if (timeSincePhaseStart - activeStorm.lastSpawnTime >= activeStorm.spawnRate) {
                  if (activeStorm.hailstones.length < activeStorm.totalCount) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * 200;
                    
                    activeStorm.hailstones.push({
                      x: Math.cos(angle) * radius,
                      y: Math.sin(angle) * radius,
                      time: currentTime
                    });
                    
                    activeStorm.lastSpawnTime = timeSincePhaseStart;
                  }
                }
                
                // Remove granizo antigo
                activeStorm.hailstones = activeStorm.hailstones.filter(hail =>
                  currentTime - hail.time < 2.0
                );
                break;
                
              case 'RAIN_WAVE':
                // Waves ocorrem em sequência
                const waveTime = timeSincePhaseStart % (activeStorm.chainWaves.delay + 0.5);
                if (waveTime < 0.5) {
                  // Wave ativa
                  arenaState.rainActive = true;
                } else {
                  arenaState.rainActive = false;
                }
                break;
            }
          }
        }
        break;
    }
    
    // Atualiza nível de intensidade
    if (currentTime >= stormSystem.intensity.lastLevelUpTime + stormSystem.intensity.levelUpTime) {
      stormSystem.intensity.level = Math.min(3, stormSystem.intensity.level + 1);
      stormSystem.intensity.lastLevelUpTime = currentTime;
    }
  }
  
  // ============================================
  // VOLCANIC_RAGE — Heat System & Eruption Event
  // ============================================
  if (arenaState.type === 'VOLCANIC_RAGE' && arenaConfig) {
    const hs = arenaConfig.heatSystem;
    const er = arenaConfig.eruptionEvent;
    const fs = arenaConfig.fissureSystem;
    const currentTime = arenaState.time;

    // ── Abre fissuras após openDelay ──────────────────────────
    if (!arenaState.fissureOpen && currentTime >= fs.openDelay) {
      arenaState.fissureOpen = true;
      arenaConfig.fissureSystem.open = true;
      // Inicializa ângulo base das fissuras rotativas
      arenaConfig.fissureSystem.baseAngle = 0;
    }

    // Atualiza ângulo das fissuras rotativas
    if (arenaState.fissureOpen) {
      arenaConfig.fissureSystem.baseAngle = currentTime * fs.rotationSpeed;
    }

    // ── Ganho passivo de heat ─────────────────────────────────
    if (!arenaState.eruptionActive) {
      arenaState.heat = Math.min(hs.maxLevel,
        arenaState.heat + hs.gainPerSecond * deltaTime
      );
    }

    // ── Erupção: dispara quando heat = 100 ───────────────────
    if (!arenaState.eruptionActive && arenaState.heat >= hs.maxLevel) {
      arenaState.eruptionActive    = true;
      arenaState.eruptionStartTime = currentTime;
    }

    // ── Ciclo de erupção ─────────────────────────────────────
    if (arenaState.eruptionActive) {
      const elapsed = currentTime - arenaState.eruptionStartTime;

      if (elapsed >= er.duration) {
        // Erupção terminou — sempre spawna lava bombs
        arenaState.eruptionActive = false;
        arenaState.heat = hs.resetTo;

        const lb = er.lavaBombs;
        const bombCount = lb.count + Math.floor(Math.random() * (lb.countMax - lb.count + 1));
        for (let i = 0; i < bombCount; i++) {
          const angle = (Math.PI * 2 / bombCount) * i + Math.random() * 0.5;
          const r = arenaConfig.zones.magmaCore +
                    Math.random() * (arenaConfig.zones.lavaFlowRing - arenaConfig.zones.magmaCore);
          arenaState.lavaBombs.push({
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r,
            spawnTime: currentTime,
            hit: false,
          });
        }
      }
    }

    // Remove lava bombs expiradas
    arenaState.lavaBombs = (arenaState.lavaBombs || []).filter(
      b => !b.hit && currentTime - b.spawnTime < (er.lavaBombs?.lifetime || 2.5)
    );
  }

  return arenaState;
}
