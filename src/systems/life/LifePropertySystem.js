/**
 * Portfólio residencial do circuito. A moradia não é um item genérico de luxo:
 * cada imóvel tem lugar, escala, atmosfera e um motivo para existir na vida do atleta.
 * O catálogo é deliberadamente aberto; adicionar uma cidade é somente adicionar um objeto.
 */

const PROPERTY_CATALOG = [
  ['BELO_HORIZONTE','BRA','casa-jardim','Casa com jardim no Mangabeiras','URBAN_ROOTS',180000,240,'raízes, família e cidade'],
  ['FLORIANÓPOLIS','BRA','casa de praia','Casa de praia na Lagoa da Conceição','COASTAL_CALM',390000,520,'mar, descanso e vida simples'],
  ['BENTO_GONÇALVES','BRA','casa de campo','Casa entre vinhedos em Bento Gonçalves','RURAL_SLOW',260000,310,'silêncio, vinho e interior'],
  ['CÓRDOBA','ARG','casa térrea','Casa térrea nas Sierras de Córdoba','RURAL_SLOW',145000,190,'família e montanhas baixas'],
  ['MENDOZA','ARG','vinícola pequena','Casa de vinhedo em Mendoza','RURAL_SLOW',310000,390,'terra, comida e recomeço'],
  ['PUNTA_DEL_ESTE','URU','casa de praia','Refúgio discreto em José Ignacio','COASTAL_CALM',680000,820,'praia sem excesso'],
  ['GIRONA','ESP','casa de pedra','Casa de pedra perto de Girona','TRAINING_HIDEAWAY',420000,530,'treino, bicicleta e privacidade'],
  ['VALENCIA','ESP','apartamento','Apartamento luminoso em Valência','URBAN_BALANCE',330000,410,'cidade viva sem alarde'],
  ['GRANADA','ESP','casa histórica','Casa no Albaicín, Granada','CULTURAL_HIDEAWAY',290000,350,'história, arte e calma'],
  ['BIARRITZ','FRA','casa de surf','Casa de surf em Biarritz','COASTAL_CALM',760000,940,'oceano e recuperação'],
  ['LYON','FRA','apartamento','Apartamento de bairro em Lyon','URBAN_BALANCE',480000,610,'gastronomia e rotina'],
  ['TOSCANA','ITA','casa rural','Casa rural na Toscana','RURAL_SLOW',630000,760,'família, olivais e sossego'],
  ['BOLZANO','ITA','chalé','Chalé perto de Bolzano','MOUNTAIN_RECOVERY',540000,690,'altitude e recuperação'],
  ['PORTO','POR','casa geminada','Casa geminada no Porto','URBAN_ROOTS',300000,380,'cidade, amigos e raízes'],
  ['ALENTEJO','POR','quinta','Quinta no Alentejo','RURAL_SLOW',360000,430,'interior e anonimato'],
  ['SPLIT','CRO','casa costeira','Casa costeira nos arredores de Split','COASTAL_CALM',410000,510,'mar e família'],
  ['CLUJ_NAPOCA','ROU','casa moderna','Casa moderna em Cluj-Napoca','URBAN_ROOTS',230000,280,'origem e vida prática'],
  ['BRNO','CZE','casa familiar','Casa familiar em Brno','URBAN_ROOTS',215000,260,'família e discrição'],
  ['CAPE_TOWN','RSA','casa entre montanha e mar','Casa aos pés da Table Mountain','COASTAL_CALM',520000,650,'natureza e horizonte'],
  ['STELLENBOSCH','RSA','fazenda pequena','Casa em Stellenbosch','RURAL_SLOW',370000,450,'vinhos e pausa'],
  ['MELBOURNE','AUS','casa vitoriana','Casa vitoriana em Melbourne','URBAN_BALANCE',850000,1050,'cultura e circuito'],
  ['BYRON_BAY','AUS','casa de madeira','Casa de madeira em Byron Bay','COASTAL_CALM',900000,1100,'surf e vida leve'],
  ['KYOTO','JPN','machiya','Machiya restaurada em Kyoto','CULTURAL_HIDEAWAY',690000,800,'ritual, silêncio e cultura'],
  ['QUEENSTOWN','NZL','chalé','Chalé em Queenstown','MOUNTAIN_RECOVERY',720000,870,'montanha e aventura'],
  ['AUSTIN','USA','casa contemporânea','Casa contemporânea em Austin','URBAN_BALANCE',640000,790,'música, amigos e privacidade'],
  ['ASHEVILLE','USA','cabana','Cabana nas montanhas de Asheville','MOUNTAIN_RECOVERY',410000,490,'trilhas e recuperação'],
  ['SANTA_BARBARA','USA','casa de praia','Casa de praia em Santa Barbara','COASTAL_CALM',1600000,1800,'sol e rotina protegida'],
  ['MEDELLÍN','COL','casa com pátio','Casa com pátio em Medellín','URBAN_ROOTS',250000,300,'família e clima ameno'],
  ['CHIANG_MAI','THA','casa tropical','Casa tropical em Chiang Mai','CULTURAL_HIDEAWAY',175000,220,'baixo ruído e bem-estar'],
  ['MARRAKESH','MAR','riad','Riad restaurado em Marrakesh','CULTURAL_HIDEAWAY',340000,410,'cor, silêncio e arte'],
  ['REYKJAVIK','ISL','casa compacta','Casa compacta em Reykjavik','MOUNTAIN_RECOVERY',460000,560,'isolamento e foco'],
].map(([id,country,type,label,setting,price,monthlyCost,reason]) => ({ id,country,type,label,setting,price,monthlyCost,reason }));

const SETTING_EFFECTS = {
  URBAN_ROOTS:{ support:2, pressure:-.5 }, COASTAL_CALM:{ recovery:2, pressure:-1, injuryRisk:-.5 }, RURAL_SLOW:{ recovery:2, support:1, commercial:-.5 },
  TRAINING_HIDEAWAY:{ matchFocus:1.2, recovery:1.5, pressure:-1 }, CULTURAL_HIDEAWAY:{ support:1, pressure:-1 }, MOUNTAIN_RECOVERY:{ recovery:2.5, injuryRisk:-1, matchFocus:.5 },
  URBAN_BALANCE:{ support:1, commercial:1, pressure:.3 },
};

function hash(value='') { let n=2166136261; for (const char of String(value)) { n ^= char.charCodeAt(0); n=Math.imul(n,16777619); } return n >>> 0; }
function unit(seed,salt) { return (hash(`${seed}:${salt}`)%10000)/10000; }
function clamp(value,min,max) { return Math.max(min,Math.min(max,value)); }
function cityFromLegacy(property, home) { return property.city ?? property.location ?? home?.city ?? 'cidade natal'; }

function enrichProperty(property, home, index=0) {
  const city = cityFromLegacy(property, home);
  const catalog = PROPERTY_CATALOG.find(item => item.id === property.catalogId || item.id === city.toUpperCase().replaceAll(' ','_'));
  const setting = property.setting ?? catalog?.setting ?? (property.main ? 'URBAN_ROOTS' : 'COASTAL_CALM');
  return {
    id: property.id ?? `legacy-home-${index}-${String(city).toLowerCase().replaceAll(' ','-')}`,
    catalogId: property.catalogId ?? catalog?.id ?? null,
    label: property.label ?? catalog?.label ?? 'Residência', type: property.type ?? catalog?.type ?? 'casa',
    city, country: property.country ?? catalog?.country ?? home?.country ?? null, setting,
    reason: property.reason ?? catalog?.reason ?? (property.main ? 'base principal de vida' : 'refúgio fora do circuito'),
    main: !!property.main, ownership: property.ownership ?? 'OWNED', acquiredAt: property.acquiredAt ?? null,
    estimatedValue: property.estimatedValue ?? catalog?.price ?? null, monthlyCost: property.monthlyCost ?? catalog?.monthlyCost ?? 0,
  };
}

export function ensurePropertyPortfolio(player) {
  if (!player?.lifeData?.home) return player;
  const home = player.lifeData.home;
  const properties = (home.properties ?? []).map((property,index) => enrichProperty(property,home,index));
  if (!properties.length) properties.push(enrichProperty({ main:true, label:'Casa de origem', type:'casa', location:home.city ?? 'cidade natal', ownership:'FAMILY_HOME' },home,0));
  if (!properties.some(property => property.main)) properties[0] = { ...properties[0], main:true };
  const main = properties.find(property => property.main);
  return { ...player, lifeData:{ ...player.lifeData, home:{ ...home, city:home.city ?? main.city, country:home.country ?? main.country, properties } } };
}

export function getPropertyLifeEffects(player) {
  const main = player?.lifeData?.home?.properties?.find(property => property.main);
  return { ...(SETTING_EFFECTS[main?.setting] ?? {}) };
}

function affordable(player, property) {
  const finance = player.finance ?? {};
  const liquid = Math.max(0, finance.budget ?? 0) + Math.max(0, finance.currentSeasonEarnings ?? 0) * .45;
  const tier = player.lifeData?.wealth?.tier?.id;
  const rank = player.rankPosition ?? 999;
  const privileged = ['WEALTHY','VERY_WEALTHY','BILLIONAIRE_TIER'].includes(tier) || rank <= 45;
  return privileged && (liquid >= property.price * .16 || (rank <= 12 && property.price <= 900000));
}

function chooseProperty(player,date) {
  const owned = new Set((player.lifeData?.home?.properties ?? []).map(property => property.catalogId).filter(Boolean));
  const profile = player.lifeSimulation?.profile ?? {};
  const wantsQuiet = (profile.privacyNeed ?? 50) > 58 || ['PRIVATE_BALANCER','FAMILY_ANCHOR'].includes(profile.lifestyleId);
  const wantsCity = (profile.commercialAppetite ?? 45) > 68;
  const pool = PROPERTY_CATALOG.filter(property => !owned.has(property.id)).filter(property => affordable(player,property));
  const fitted = pool.filter(property => wantsQuiet ? !['URBAN_BALANCE'].includes(property.setting) : wantsCity ? property.setting === 'URBAN_BALANCE' : true);
  const options = fitted.length ? fitted : pool;
  return options.length ? options[Math.floor(unit(player.id ?? player.name, `${date.year}-${date.month}:property`) * options.length)] : null;
}

/** Compra automática rara, mas concreta: apenas quando o atleta pode realmente sustentar a escolha. */
export function processMonthlyPropertyPortfolio(players=[],date={ year:2025, month:1 }) {
  const events=[];
  const updatedPlayers=players.map(raw => {
    let player=ensurePropertyPortfolio(raw);
    const home=player.lifeData?.home;
    if (!home) return player;
    const properties=home.properties ?? [];
    const maxProperties=(player.rankPosition ?? 999) <= 15 ? 4 : (player.rankPosition ?? 999) <= 70 ? 3 : 2;
    const signal=unit(player.id ?? player.name, `${date.year}-${date.month}:home-opportunity`);
    if (properties.length >= maxProperties || signal < .965 || (player.age ?? 25) < 21) return player;
    const chosen=chooseProperty(player,date);
    if (!chosen) return player;
    const downPayment=Math.round(chosen.price*.18);
    const city=chosen.id.split('_').map(part=>part[0]+part.slice(1).toLowerCase()).join(' ');
    const makesMain = unit(player.id ?? player.name, `${date.year}-${date.month}:move-base`) > .78;
    const property={ id:`property:${chosen.id}:${date.year}-${date.month}`, catalogId:chosen.id, label:chosen.label, type:chosen.type, city, country:chosen.country, setting:chosen.setting, reason:chosen.reason, main:makesMain, ownership:'OWNED', acquiredAt:{year:date.year,month:date.month}, estimatedValue:chosen.price, monthlyCost:chosen.monthlyCost };
    const portfolio=makesMain ? [...properties.map(item => ({ ...item, main:false })),property] : [...properties,property];
    const lifeEvent={ type:'PROPERTY_PURCHASED', category:'HOME', label:makesMain ? 'Compra e mudança de base' : 'Compra de propriedade', description:makesMain ? `${player.name} compra ${chosen.label} e muda sua base para ${city}` : `${player.name} compra ${chosen.label} em ${city}`, icon:'⌂', date:{year:date.year,month:date.month}, dateKey:`${date.year}-${String(date.month).padStart(2,'0')}`, season:date.year, monthIndex:date.month, marketImpact:chosen.price > 900000 ? 3 : 1 };
    const next={ ...player, lifeData:{ ...player.lifeData, home:{ ...home, ...(makesMain ? { city, country:chosen.country, taxHaven:false } : {}), properties:portfolio } }, lifeEventLog:[...(player.lifeEventLog ?? []),lifeEvent].slice(-160), finance:player.finance ? { ...player.finance, budget:(player.finance.budget ?? 0)-downPayment, careerBudgetNet:(player.finance.careerBudgetNet ?? 0)-downPayment, propertyAssets:(player.finance.propertyAssets ?? 0)+chosen.price, propertyInvested:(player.finance.propertyInvested ?? 0)+downPayment } : player.finance };
    events.push({ type:'PROPERTY_PURCHASED', category:'HOME', playerId:player.id, playerName:player.name, label:makesMain ? `${player.name} compra ${chosen.label} e muda sua base` : `${player.name} compra ${chosen.label}`, property, date, marketImpact:chosen.price > 900000 ? 3 : 1 });
    return next;
  });
  return { players:updatedPlayers, events };
}

export function getPropertyPortfolio(player) { return player?.lifeData?.home?.properties ?? []; }
