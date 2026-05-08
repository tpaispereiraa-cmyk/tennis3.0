/**
 * LifeMemorySystem.js
 * ---------------------------------------------------------------------------
 * Camada de memoria pessoal do jogador.
 *
 * lifeData diz quem o jogador e.
 * lifeEventLog diz o que aconteceu com ele.
 * lifeMemory guarda o que ficou marcado: lugares, familia, posses, valores,
 * projetos, polemicas e rituais que podem alimentar entrevistas, biografias
 * e jornalismo com contexto real.
 */

export const LIFE_MEMORY_VERSION = 1;

const CAPS = {
  all: 36,
  focused: 12,
  favorites: 5,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeText(v) {
  return String(v ?? '').trim();
}

function slug(v) {
  return safeText(v)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function importanceFromPlayer(player, base = 40) {
  const market = player.personality?.marketability?.score ?? 35;
  const rank = player.rank ?? player.ranking ?? 80;
  const rankBoost = rank <= 5 ? 14 : rank <= 10 ? 10 : rank <= 25 ? 6 : rank <= 60 ? 3 : 0;
  return clamp(Math.round(base + market / 10 + rankBoost), 1, 100);
}

function emptyMemory(existing = {}) {
  return {
    version: LIFE_MEMORY_VERSION,
    places: {
      roots: existing.places?.roots ?? [],
      beloved: existing.places?.beloved ?? [],
      escapes: existing.places?.escapes ?? [],
      landmarks: existing.places?.landmarks ?? [],
      all: existing.places?.all ?? [],
    },
    family: {
      anchors: existing.family?.anchors ?? [],
      joys: existing.family?.joys ?? [],
      strains: existing.family?.strains ?? [],
      milestones: existing.family?.milestones ?? [],
      all: existing.family?.all ?? [],
    },
    lifestyle: {
      homes: existing.lifestyle?.homes ?? [],
      possessions: existing.lifestyle?.possessions ?? [],
      rituals: existing.lifestyle?.rituals ?? [],
      identity: existing.lifestyle?.identity ?? [],
      all: existing.lifestyle?.all ?? [],
    },
    values: {
      projects: existing.values?.projects ?? [],
      beliefs: existing.values?.beliefs ?? [],
      controversies: existing.values?.controversies ?? [],
      all: existing.values?.all ?? [],
    },
    publicLife: {
      media: existing.publicLife?.media ?? [],
      business: existing.publicLife?.business ?? [],
      controversies: existing.publicLife?.controversies ?? [],
      all: existing.publicLife?.all ?? [],
    },
    favorites: {
      places: existing.favorites?.places ?? [],
      possessions: existing.favorites?.possessions ?? [],
      rituals: existing.favorites?.rituals ?? [],
      projects: existing.favorites?.projects ?? [],
      publicChapters: existing.favorites?.publicChapters ?? [],
    },
    lastUpdatedYear: existing.lastUpdatedYear ?? null,
  };
}

function sortMemories(list) {
  return [...(list ?? [])].sort((a, b) => {
    const ai = a.importance ?? 0;
    const bi = b.importance ?? 0;
    if (bi !== ai) return bi - ai;
    return (b.year ?? 0) - (a.year ?? 0);
  });
}

function upsert(list, entry, cap = CAPS.focused) {
  if (!entry?.key) return list ?? [];
  const idx = (list ?? []).findIndex(item => item.key === entry.key);
  const merged = [...(list ?? [])];
  if (idx >= 0) {
    const old = merged[idx];
    merged[idx] = {
      ...old,
      ...entry,
      importance: Math.max(old.importance ?? 0, entry.importance ?? 0),
      firstYear: old.firstYear ?? entry.firstYear ?? entry.year ?? null,
      lastYear: entry.year ?? old.lastYear ?? old.year ?? null,
      mentions: Math.max(old.mentions ?? 1, entry.mentions ?? 1),
      reasons: Array.from(new Set([...(old.reasons ?? []), ...(entry.reasons ?? [])])).slice(0, 6),
      quoteSeeds: Array.from(new Set([...(old.quoteSeeds ?? []), ...(entry.quoteSeeds ?? [])])).slice(0, 8),
    };
  } else {
    merged.push({
      firstYear: entry.firstYear ?? entry.year ?? null,
      lastYear: entry.year ?? null,
      mentions: entry.mentions ?? 1,
      ...entry,
    });
  }
  return sortMemories(merged).slice(0, cap);
}

function addTo(memory, path, entry, cap = CAPS.focused) {
  const [section, bucket] = path;
  return {
    ...memory,
    [section]: {
      ...memory[section],
      [bucket]: upsert(memory[section]?.[bucket], entry, cap),
      all: upsert(memory[section]?.all, entry, CAPS.all),
    },
  };
}

function recomputeFavorites(memory) {
  const placePool = [
    ...(memory.places?.beloved ?? []),
    ...(memory.places?.escapes ?? []),
    ...(memory.places?.landmarks ?? []),
    ...(memory.places?.roots ?? []),
  ];
  const publicPool = [
    ...(memory.publicLife?.media ?? []),
    ...(memory.publicLife?.business ?? []),
    ...(memory.values?.controversies ?? []),
  ];
  return {
    ...memory,
    favorites: {
      places: sortMemories(placePool).slice(0, CAPS.favorites),
      possessions: sortMemories(memory.lifestyle?.possessions ?? []).slice(0, CAPS.favorites),
      rituals: sortMemories(memory.lifestyle?.rituals ?? []).slice(0, CAPS.favorites),
      projects: sortMemories(memory.values?.projects ?? []).slice(0, CAPS.favorites),
      publicChapters: sortMemories(publicPool).slice(0, CAPS.favorites),
    },
  };
}

function baseEntry(player, kind, label, extra = {}) {
  return {
    key: `${kind}:${slug(label)}`,
    kind,
    label: safeText(label),
    playerId: player.id,
    emotion: 'fond',
    importance: importanceFromPlayer(player, extra.baseImportance ?? 38),
    reasons: [],
    quoteSeeds: [],
    ...extra,
  };
}

function addPlaceMemory(memory, player, place, kind, extra = {}) {
  if (!place?.label && !place?.city) return memory;
  const label = place.label ?? place.city;
  const entry = baseEntry(player, kind, label, {
    city: place.city ?? null,
    country: place.country ?? null,
    placeKind: place.kind ?? kind,
    ...extra,
  });
  const bucket =
    kind === 'birthplace' ? 'roots' :
    kind === 'escape' ? 'escapes' :
    kind === 'landmark' ? 'landmarks' :
    'beloved';
  return addTo(memory, ['places', bucket], entry);
}

function addStaticLifeData(memory, player, season = null) {
  const ld = player.lifeData;
  if (!ld) return memory;
  let m = memory;
  const age = player.age ?? null;

  const places = ld.places ?? {};
  if (places.birthPlace) {
    m = addPlaceMemory(m, player, places.birthPlace, 'birthplace', {
      emotion: 'roots',
      importance: importanceFromPlayer(player, 58),
      reasons: ['origem pessoal'],
      quoteSeeds: [`nasci ligado a ${places.birthPlace.label ?? places.birthPlace.city}`],
      year: season,
      age,
    });
  }
  if (places.favoriteCity) {
    m = addPlaceMemory(m, player, places.favoriteCity, 'favorite_city', {
      emotion: 'affection',
      importance: importanceFromPlayer(player, 64),
      reasons: ['cidade favorita fora do circuito'],
      quoteSeeds: [`${places.favoriteCity.label} me tira do barulho do tour`],
      year: season,
      age,
    });
  }
  if (places.favoriteEscape) {
    m = addPlaceMemory(m, player, places.favoriteEscape, 'escape', {
      emotion: 'peace',
      importance: importanceFromPlayer(player, 56),
      reasons: ['lugar de fuga e descanso'],
      quoteSeeds: [`quando preciso respirar, penso em ${places.favoriteEscape.label}`],
      year: season,
      age,
    });
  }
  if (places.favoriteLandmark) {
    m = addPlaceMemory(m, player, places.favoriteLandmark, 'landmark', {
      emotion: 'wonder',
      importance: importanceFromPlayer(player, 50),
      reasons: ['ponto marcante no mapa afetivo'],
      quoteSeeds: [`${places.favoriteLandmark.label} virou um lugar especial para mim`],
      year: season,
      age,
    });
  }
  for (const place of places.placesLoved ?? []) {
    m = addPlaceMemory(m, player, place, 'beloved_place', {
      emotion: 'fond',
      importance: importanceFromPlayer(player, 44),
      reasons: ['lugar que gosta de revisitar'],
      year: season,
      age,
    });
  }

  const partner = ld.personal?.partner;
  if (partner) {
    m = addTo(m, ['family', 'anchors'], baseEntry(player, 'partner', partner.name ?? partner.label, {
      emotion: 'intimate',
      importance: importanceFromPlayer(player, partner.public ? 70 : 58),
      description: `${partner.label ?? 'Parceiro'}; se conheceram ${partner.howMet ?? 'fora do circuito'}${partner.dynamic?.label ? `; dinâmica: ${partner.dynamic.label}` : ''}`,
      partnerAge: partner.age ?? null,
      dynamic: partner.dynamic ?? null,
      privacy: partner.privacy ?? null,
      strain: partner.strain ?? null,
      reasons: ['vida afetiva', partner.dynamic?.label].filter(Boolean),
      quoteSeeds: [
        `${partner.name ?? 'minha parceria'} conhece o lado que quase ninguem ve`,
        partner.dynamic?.tone ? `a nossa vida tem um tom ${partner.dynamic.tone}` : null,
      ].filter(Boolean),
      year: season,
      age,
    }));
  }
  if (ld.personal?.familyPlan) {
    m = addTo(m, ['family', 'milestones'], baseEntry(player, 'family_plan', ld.personal.familyPlan.label, {
      emotion: 'future',
      importance: importanceFromPlayer(player, 50),
      description: ld.personal.familyPlan.desc,
      reasons: ['projeto familiar'],
      quoteSeeds: [`familia e uma palavra que muda de tamanho conforme a carreira muda`],
      year: season,
      age,
    }));
  }
  if (ld.personal?.children?.has) {
    for (const child of ld.personal.children.list ?? []) {
      m = addTo(m, ['family', 'anchors'], baseEntry(player, 'child', child.name, {
        emotion: 'love',
        importance: importanceFromPlayer(player, 74),
        description: `${child.name}, ${child.age} anos${child.personality?.label ? `, ${child.personality.label}` : ''}`,
        bornWhenPlayerAge: child.bornWhenPlayerAge ?? null,
        visibility: child.visibility ?? null,
        reasons: ['filho', child.personality?.label].filter(Boolean),
        quoteSeeds: [
          `${child.name} mudou minha nocao de tempo`,
          child.visibility === 'aparece ocasionalmente no box' ? `quando vejo ${child.name} no box, a quadra fica diferente` : null,
        ].filter(Boolean),
        year: season,
        age,
      }));
    }
  }
  for (const chapter of ld.personal?.relationshipHistory ?? []) {
    const chapterLabel = chapter.partnerName ?? chapter.childName ?? chapter.type;
    const isScar = ['DIVORCE', 'SEPARATION', 'PAST_DIVORCE', 'PAST_SEPARATION'].includes(chapter.type);
    m = addTo(m, ['family', isScar ? 'strains' : 'milestones'], baseEntry(player, 'relationship_chapter', `${chapter.type}:${chapterLabel}`, {
      label: chapterLabel,
      emotion: isScar ? 'scar' : 'chapter',
      importance: importanceFromPlayer(player, isScar ? 66 : 55),
      description: chapter.reason ?? chapter.howMet ?? chapter.type,
      relationshipChapter: chapter,
      reasons: ['historico afetivo', chapter.type].filter(Boolean),
      quoteSeeds: [
        isScar ? `nem toda historia bonita termina do jeito que a gente escreveu` : `a vida pessoal tambem tem temporadas`,
      ],
      year: season,
      age,
    }));
  }
  if (ld.personal?.pets?.has) {
    m = addTo(m, ['family', 'anchors'], baseEntry(player, 'pet', ld.personal.pets.name, {
      emotion: 'warmth',
      importance: importanceFromPlayer(player, 35),
      description: ld.personal.pets.label,
      reasons: ['companhia fora da quadra'],
      year: season,
      age,
    }));
  }

  for (const property of ld.home?.properties ?? []) {
    const label = property.main
      ? `${property.label} em ${ld.home?.city ?? 'casa principal'}`
      : property.label;
    m = addTo(m, ['lifestyle', 'homes'], baseEntry(player, property.main ? 'main_home' : 'second_home', label, {
      emotion: property.main ? 'belonging' : 'escape',
      importance: importanceFromPlayer(player, property.main ? 54 : 46),
      city: property.city ?? ld.home?.city ?? null,
      country: property.country ?? ld.home?.country ?? null,
      reasons: [property.main ? 'base de vida' : 'refugio pessoal'],
      quoteSeeds: [`essa casa virou uma parte da minha rotina`],
      year: season,
      age,
    }));
  }

  for (const vehicle of ld.wealth?.vehicles ?? []) {
    m = addTo(m, ['lifestyle', 'possessions'], baseEntry(player, 'vehicle', vehicle.label, {
      emotion: 'pleasure',
      importance: importanceFromPlayer(player, vehicle.type === 'jet' || vehicle.type === 'yacht' ? 58 : 42),
      vehicleType: vehicle.type ?? null,
      reasons: ['posse marcante'],
      quoteSeeds: [`eu gosto de maquinas, mas elas nao podem virar quem voce e`],
      year: season,
      age,
    }));
  }
  for (const possession of ld.wealth?.possessions ?? []) {
    const label = typeof possession === 'string' ? possession : possession.label;
    if (!label) continue;
    m = addTo(m, ['lifestyle', 'possessions'], baseEntry(player, `possession_${possession.type ?? 'asset'}`, label, {
      emotion: possession.type === 'investment' || possession.type === 'equity' ? 'ambition' : 'pleasure',
      importance: importanceFromPlayer(player, ['jet','boat','estate','equity'].includes(possession.type) ? 66 : 50),
      assetType: possession.type ?? null,
      emotionalUse: possession.emotionalUse ?? null,
      reasons: ['patrimonio marcante', possession.type].filter(Boolean),
      quoteSeeds: [
        possession.emotionalUse ? `${label} virou ${possession.emotionalUse}` : `nem toda posse e ostentacao; algumas contam fase`,
      ],
      year: season,
      age,
    }));
  }
  const wealthLifestyle = ld.wealth?.lifestyle;
  if (wealthLifestyle?.philosophy) {
    m = addTo(m, ['lifestyle', 'identity'], baseEntry(player, 'money_philosophy', wealthLifestyle.philosophy.label, {
      emotion: 'identity',
      importance: importanceFromPlayer(player, 56),
      description: wealthLifestyle.philosophy.desc,
      visibleLuxury: wealthLifestyle.visibleLuxury ?? null,
      riskAppetite: wealthLifestyle.riskAppetite ?? null,
      spendingMood: wealthLifestyle.spendingMood ?? null,
      reasons: ['filosofia de dinheiro'],
      quoteSeeds: [wealthLifestyle.moneyQuoteSeed ?? 'dinheiro precisa comprar liberdade, nao ansiedade'],
      year: season,
      age,
    }));
  }
  for (const signature of wealthLifestyle?.signatures ?? []) {
    m = addTo(m, ['lifestyle', 'possessions'], baseEntry(player, 'luxury_signature', signature.label, {
      emotion: 'taste',
      importance: importanceFromPlayer(player, 54),
      favoriteObject: signature.favoriteObject ?? null,
      reasons: ['assinatura de luxo'],
      quoteSeeds: [`${signature.favoriteObject ?? signature.label} diz algo sobre meu gosto fora da quadra`],
      year: season,
      age,
    }));
  }
  for (const investment of wealthLifestyle?.portfolio ?? []) {
    m = addTo(m, ['publicLife', 'business'], baseEntry(player, 'investment_profile', investment.label, {
      emotion: 'builder',
      importance: importanceFromPlayer(player, investment.risk >= 70 ? 62 : 50),
      risk: investment.risk ?? null,
      reasons: ['portfolio pessoal'],
      quoteSeeds: [`eu tento aprender negocios do mesmo jeito que aprendi tenis: errando pouco e observando muito`],
      year: season,
      age,
    }));
  }

  for (const hobby of ld.interests?.hobbies ?? []) {
    m = addTo(m, ['lifestyle', 'identity'], baseEntry(player, 'hobby', hobby.label, {
      emotion: 'identity',
      importance: importanceFromPlayer(player, 38),
      level: hobby.level ?? null,
      reasons: ['hobby pessoal'],
      year: season,
      age,
    }));
  }
  for (const ritual of ld.training?.superstitions ?? []) {
    m = addTo(m, ['lifestyle', 'rituals'], baseEntry(player, 'ritual', ritual.label, {
      emotion: 'control',
      importance: importanceFromPlayer(player, 40),
      reasons: ['ritual competitivo'],
      quoteSeeds: [`tem coisas pequenas que me colocam no mesmo lugar mental`],
      year: season,
      age,
    }));
  }
  if (ld.training?.offSeason) {
    m = addTo(m, ['lifestyle', 'rituals'], baseEntry(player, 'offseason', ld.training.offSeason.label, {
      emotion: 'discipline',
      importance: importanceFromPlayer(player, 44),
      reasons: ['rotina de intertemporada'],
      year: season,
      age,
    }));
  }
  if (ld.training?.recovery) {
    m = addTo(m, ['lifestyle', 'rituals'], baseEntry(player, 'recovery', ld.training.recovery.label, {
      emotion: 'maintenance',
      importance: importanceFromPlayer(player, 42),
      reasons: ['cuidado com o corpo'],
      year: season,
      age,
    }));
  }

  const cause = ld.values?.socialCause;
  if (cause && cause.id !== 'NONE') {
    m = addTo(m, ['values', 'projects'], baseEntry(player, 'cause', cause.label, {
      emotion: 'purpose',
      importance: importanceFromPlayer(player, 62),
      depth: cause.depth ?? null,
      reasons: ['causa social pessoal'],
      quoteSeeds: [`${cause.label} nao e so imagem, e uma parte do que eu quero devolver`],
      year: season,
      age,
    }));
  }
  const publicValues = ld.values?.publicValues;
  if (publicValues?.stance) {
    m = addTo(m, ['values', publicValues.controversyRisk >= 65 ? 'controversies' : 'beliefs'], baseEntry(player, 'public_stance', publicValues.stance.label, {
      emotion: publicValues.controversyRisk >= 65 ? 'friction' : 'conviction',
      importance: importanceFromPlayer(player, publicValues.controversyRisk >= 65 ? 68 : 54),
      description: publicValues.stance.desc,
      controversyRisk: publicValues.controversyRisk ?? null,
      nationalIdentity: publicValues.nationalIdentity ?? null,
      reasons: ['postura publica'],
      quoteSeeds: [publicValues.quoteSeed ?? 'ter voz publica nao pode ser so marketing'],
      year: season,
      age,
    }));
  }
  if (publicValues?.flagshipProject?.label) {
    m = addTo(m, ['values', 'projects'], baseEntry(player, 'flagship_project', publicValues.flagshipProject.label, {
      emotion: 'purpose',
      importance: importanceFromPlayer(player, publicValues.flagshipProject.maturity === 'institucionalizado' ? 70 : 58),
      causeId: publicValues.flagshipProject.causeId,
      maturity: publicValues.flagshipProject.maturity,
      hometownLink: !!publicValues.flagshipProject.hometownLink,
      reasons: ['projeto principal', publicValues.flagshipProject.hometownLink ? 'ligacao com cidade natal' : null].filter(Boolean),
      quoteSeeds: [
        publicValues.flagshipProject.hometownLink
          ? `esse projeto começou perto de onde eu aprendi a sonhar`
          : `um projeto serio precisa passar do discurso para a estrutura`,
      ],
      year: season,
      age,
    }));
  }
  for (const project of publicValues?.projects ?? []) {
    m = addTo(m, ['values', project.heat >= 65 ? 'controversies' : 'projects'], baseEntry(player, 'public_project', project.label, {
      emotion: project.heat >= 65 ? 'friction' : 'purpose',
      importance: importanceFromPlayer(player, project.heat >= 65 ? 66 : 56),
      projectType: project.type,
      heat: project.heat ?? null,
      reasons: ['capitulo publico', project.type].filter(Boolean),
      quoteSeeds: [project.quoteSeed ?? publicValues.quoteSeed ?? 'a plataforma tem que servir para alguma coisa'],
      year: season,
      age,
    }));
  }
  const faith = ld.values?.faith;
  if (faith && faith.id !== 'NONE') {
    m = addTo(m, ['values', 'beliefs'], baseEntry(player, 'faith', faith.label, {
      emotion: 'conviction',
      importance: importanceFromPlayer(player, 48),
      reasons: ['visao espiritual ou filosofica'],
      year: season,
      age,
    }));
  }
  if (ld.publicImage) {
    m = addTo(m, ['publicLife', 'media'], baseEntry(player, 'public_image', ld.publicImage.label, {
      emotion: 'reputation',
      importance: importanceFromPlayer(player, 52),
      description: ld.publicImage.desc,
      reasons: ['imagem publica consolidada'],
      year: season,
      age,
    }));
  }

  return m;
}

function eventImportance(event, player) {
  const categoryBase = {
    PERSONAL: 72,
    CONTROVERSY: 70,
    SOCIAL: 64,
    COMMUNITY: 58,
    BUSINESS: 56,
    MEDIA: 54,
    CAREER: 62,
    WELLNESS: 50,
    SPIRITUAL: 52,
    HOME: 46,
  };
  const newsBoost = event.newsworthy ? 9 : 0;
  const marketBoost = Math.abs(event.marketImpact ?? 0) * 2;
  return importanceFromPlayer(player, (categoryBase[event.category] ?? 46) + newsBoost + marketBoost);
}

function eventEmotion(event) {
  if (['SEPARATION', 'DIVORCE', 'FAMILY_LOSS', 'MENTAL_HEALTH_BREAK', 'BURNOUT_WARNING', 'CAREER_DOUBT'].includes(event.type)) return 'scar';
  if (['AFFAIR_RUMOR', 'RIVAL_PUBLIC_FEUD', 'FEDERATION_CONFLICT', 'TAX_CONTROVERSY', 'SPONSOR_SCANDAL'].includes(event.type)) return 'friction';
  if (['CHILD_BORN', 'TWINS_BORN', 'ADOPTION', 'MARRIAGE', 'ENGAGEMENT'].includes(event.type)) return 'joy';
  if (['FOUNDATION_LAUNCH', 'BIG_DONATION', 'SCHOOL_PROGRAM', 'NATIONAL_AWARD'].includes(event.type)) return 'purpose';
  if (['DOCUMENTARY', 'AUTOBIOGRAPHY', 'MAGAZINE_COVER'].includes(event.type)) return 'spotlight';
  if (['COACHING_ACADEMY', 'STARTUP_INVESTMENT', 'FASHION_LINE', 'WELLNESS_BRAND'].includes(event.type)) return 'builder';
  return 'chapter';
}

function eventQuoteSeed(event) {
  const description = safeText(event.description).toLowerCase();
  if (eventEmotion(event) === 'scar') return `aquele periodo me ensinou coisas que vitoria nenhuma ensina`;
  if (eventEmotion(event) === 'friction') return `nem tudo que sai sobre voce explica quem voce e`;
  if (eventEmotion(event) === 'joy') return `existem dias que colocam o tenis no tamanho certo`;
  if (eventEmotion(event) === 'purpose') return `eu comecei a entender melhor o tamanho da minha plataforma`;
  if (eventEmotion(event) === 'spotlight') return `de repente a historia saiu da quadra e ficou maior`;
  if (eventEmotion(event) === 'builder') return `eu queria construir algo que continuasse fora das linhas`;
  return description ? `eu lembro bem de quando ${description}` : `foi um capitulo importante da minha vida`;
}

function memoryFromEvent(player, event, season) {
  const label = event.label ?? event.type;
  return {
    key: `event:${event.type}:${event.season ?? season}`,
    kind: `life_event_${safeText(event.category).toLowerCase()}`,
    label,
    playerId: player.id,
    type: event.type,
    category: event.category,
    year: event.season ?? season ?? null,
    age: player.age ?? null,
    description: event.description,
    emotion: eventEmotion(event),
    importance: eventImportance(event, player),
    reasons: [safeText(event.category).toLowerCase(), event.newsworthy ? 'noticiavel' : 'pessoal'].filter(Boolean),
    quoteSeeds: [eventQuoteSeed(event)],
    sourceEvent: event,
  };
}

function addEventMemory(memory, player, event, season) {
  const entry = memoryFromEvent(player, event, season);
  if (event.category === 'PERSONAL') {
    const bucket = entry.emotion === 'scar' || entry.emotion === 'friction' ? 'strains' : 'joys';
    let m = addTo(memory, ['family', bucket], entry);
    return addTo(m, ['family', 'milestones'], entry);
  }
  if (event.category === 'HOME') {
    const isPossession = /CAR|YACHT|JET|WATCH|LUXURY|ART|WINE/i.test(event.type);
    return addTo(memory, ['lifestyle', isPossession ? 'possessions' : 'homes'], entry);
  }
  if (event.category === 'SOCIAL' || event.category === 'COMMUNITY') {
    return addTo(memory, ['values', 'projects'], entry);
  }
  if (event.category === 'SPIRITUAL') {
    return addTo(memory, ['values', 'beliefs'], entry);
  }
  if (event.category === 'WELLNESS') {
    return addTo(memory, ['lifestyle', 'rituals'], entry);
  }
  if (event.category === 'BUSINESS') {
    return addTo(memory, ['publicLife', 'business'], entry);
  }
  if (event.category === 'MEDIA' || event.category === 'CAREER') {
    return addTo(memory, ['publicLife', 'media'], entry);
  }
  if (event.category === 'CONTROVERSY') {
    let m = addTo(memory, ['values', 'controversies'], entry);
    return addTo(m, ['publicLife', 'controversies'], entry);
  }
  return addTo(memory, ['publicLife', 'media'], entry);
}

export function ensureLifeMemory(player, season = null) {
  if (!player?.lifeData) return player;
  const base = emptyMemory(player.lifeMemory);
  const seeded = addStaticLifeData(base, player, season);
  return {
    ...player,
    lifeMemory: recomputeFavorites({
      ...seeded,
      version: LIFE_MEMORY_VERSION,
      lastUpdatedYear: season ?? seeded.lastUpdatedYear ?? player.lifeMemory?.lastUpdatedYear ?? null,
    }),
  };
}

export function updateLifeMemoryFromEvents(player, events = [], season = null) {
  if (!player?.lifeData) return player;
  let next = ensureLifeMemory(player, season);
  let memory = next.lifeMemory;
  for (const event of events ?? []) {
    memory = addEventMemory(memory, next, event, season);
  }
  return {
    ...next,
    lifeMemory: recomputeFavorites({
      ...memory,
      lastUpdatedYear: season ?? memory.lastUpdatedYear ?? null,
    }),
  };
}

export function recordBusinessLifeMemory(player, entry = {}, season = null) {
  if (!player?.lifeData || !entry?.label) return player;
  const next = ensureLifeMemory(player, season);
  const memory = addTo(next.lifeMemory, ['publicLife', 'business'], baseEntry(next, entry.kind ?? 'business_chapter', entry.label, {
    key: entry.key ?? `${entry.kind ?? 'business_chapter'}:${slug(entry.label)}:${season ?? entry.year ?? 'x'}`,
    emotion: entry.emotion ?? 'public',
    year: entry.year ?? season ?? null,
    sponsorId: entry.sponsorId ?? null,
    sponsorName: entry.sponsorName ?? null,
    sponsorTier: entry.sponsorTier ?? null,
    annualFee: entry.annualFee ?? null,
    campaign: entry.campaign ?? null,
    contractType: entry.contractType ?? null,
    importance: entry.importance ?? importanceFromPlayer(next, entry.baseImportance ?? 48),
    reasons: entry.reasons ?? ['capitulo comercial'],
    quoteSeeds: entry.quoteSeeds ?? [],
  }));
  return {
    ...next,
    lifeMemory: recomputeFavorites({
      ...memory,
      lastUpdatedYear: season ?? entry.year ?? memory.lastUpdatedYear ?? null,
    }),
  };
}

export function summarizeLifeMemory(player) {
  const lm = player.lifeMemory;
  if (!lm) return '';
  const place = lm.favorites?.places?.[0];
  const possession = lm.favorites?.possessions?.[0];
  const project = lm.favorites?.projects?.[0];
  const family = lm.family?.anchors?.[0] ?? lm.family?.joys?.[0] ?? lm.family?.strains?.[0];
  return [
    place ? `Lugar-memoria: ${place.label}` : null,
    family ? `Nucleo pessoal: ${family.label}` : null,
    possession ? `Objeto/posse marcante: ${possession.label}` : null,
    project ? `Projeto/causa: ${project.label}` : null,
  ].filter(Boolean).join(' | ');
}
