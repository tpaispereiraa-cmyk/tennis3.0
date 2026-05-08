/**
 * SponsorMemorySystem.js
 *
 * Memória comercial do jogador: marcas que apostaram cedo, contratos que
 * mudaram patamar, campanhas simbólicas, rupturas e relações de lealdade.
 */

import { recordBusinessLifeMemory } from '../life/LifeMemorySystem.js';

export const SPONSOR_MEMORY_VERSION = 1;

const CAPS = { all: 34, focused: 10, favorites: 5 };

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function slug(v) {
  return String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function fmtMoney(v) {
  const abs = Math.abs(Number(v) || 0);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(abs / 1000)}K`;
  return `$${abs}`;
}

function emptyMemory(existing = {}) {
  return {
    version: SPONSOR_MEMORY_VERSION,
    relationships: existing.relationships ?? [],
    breakthroughs: existing.breakthroughs ?? [],
    campaigns: existing.campaigns ?? [],
    loyalties: existing.loyalties ?? [],
    scars: existing.scars ?? [],
    all: existing.all ?? [],
    favorites: existing.favorites ?? {},
    lastUpdatedYear: existing.lastUpdatedYear ?? null,
  };
}

function importanceFor(player, contract, base = 40) {
  const rank = player?.rankPosition ?? 999;
  const rankBoost = rank <= 1 ? 14 : rank <= 5 ? 10 : rank <= 10 ? 7 : rank <= 25 ? 4 : 0;
  const tierBoost = { ELITE: 18, PREMIUM: 10, MID: 4, ENTRY: 1 }[contract?.sponsorTier] ?? 0;
  const fee = contract?.annualFee ?? 0;
  const feeBoost = fee >= 10_000_000 ? 12 : fee >= 3_000_000 ? 8 : fee >= 800_000 ? 4 : 0;
  return clamp(Math.round(base + rankBoost + tierBoost + feeBoost), 1, 100);
}

function sort(list) {
  return [...(list ?? [])].sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0) || (b.year ?? 0) - (a.year ?? 0));
}

function upsert(list, entry, cap = CAPS.focused) {
  if (!entry?.key) return list ?? [];
  const arr = [...(list ?? [])];
  const idx = arr.findIndex(x => x.key === entry.key);
  if (idx >= 0) {
    const old = arr[idx];
    arr[idx] = {
      ...old,
      ...entry,
      importance: Math.max(old.importance ?? 0, entry.importance ?? 0),
      firstYear: old.firstYear ?? entry.firstYear ?? entry.year ?? null,
      lastYear: entry.year ?? old.lastYear ?? old.year ?? null,
      mentions: (old.mentions ?? 1) + 1,
      quoteSeeds: Array.from(new Set([...(old.quoteSeeds ?? []), ...(entry.quoteSeeds ?? [])])).slice(0, 8),
      reasons: Array.from(new Set([...(old.reasons ?? []), ...(entry.reasons ?? [])])).slice(0, 8),
    };
  } else {
    arr.push({ firstYear: entry.year ?? null, lastYear: entry.year ?? null, mentions: 1, ...entry });
  }
  return sort(arr).slice(0, cap);
}

function add(memory, bucket, entry) {
  return {
    ...memory,
    [bucket]: upsert(memory[bucket], entry, CAPS.focused),
    all: upsert(memory.all, entry, CAPS.all),
  };
}

function recomputeFavorites(memory) {
  return {
    ...memory,
    favorites: {
      brand: sort(memory.relationships ?? [])[0] ?? null,
      breakthrough: sort(memory.breakthroughs ?? [])[0] ?? null,
      campaign: sort(memory.campaigns ?? [])[0] ?? null,
      loyalty: sort(memory.loyalties ?? [])[0] ?? null,
      scar: sort(memory.scars ?? [])[0] ?? null,
      all: sort(memory.all ?? []).slice(0, CAPS.favorites),
    },
  };
}

function baseEntry(player, contract, kind, emotion, extra = {}) {
  const sponsorName = contract?.sponsorName ?? extra.sponsorName ?? 'Patrocinador';
  return {
    key: `${kind}:${contract?.sponsorId ?? slug(sponsorName)}:${contract?.seasonSigned ?? extra.year ?? 'x'}`,
    kind,
    emotion,
    playerId: player?.id ?? contract?.playerId ?? null,
    sponsorId: contract?.sponsorId ?? null,
    sponsorName,
    sponsorTier: contract?.sponsorTier ?? null,
    category: contract?.category ?? null,
    annualFee: contract?.annualFee ?? null,
    year: contract?.seasonSigned ?? extra.year ?? null,
    importance: importanceFor(player, contract, extra.baseImportance ?? 42),
    reasons: [],
    quoteSeeds: [],
    ...extra,
  };
}

function withBusinessLifeMemory(player, contract, kind, emotion, context = {}, extra = {}) {
  const importance = importanceFor(player, contract, extra.baseImportance ?? 48);
  if (importance < (extra.minImportance ?? 52) && !extra.force) return player;
  const year = context.year ?? contract?.seasonSigned ?? contract?.terminatedYear ?? null;
  return recordBusinessLifeMemory(player, {
    key: `sponsor:${kind}:${contract?.sponsorId ?? slug(contract?.sponsorName)}:${year ?? 'x'}`,
    kind,
    label: extra.label ?? `${contract?.sponsorName ?? 'Marca'} marcou a vida pública`,
    emotion,
    year,
    sponsorId: contract?.sponsorId ?? null,
    sponsorName: contract?.sponsorName ?? null,
    sponsorTier: contract?.sponsorTier ?? null,
    annualFee: contract?.annualFee ?? null,
    campaign: extra.campaign ?? contract?.campaignConcept?.hook ?? null,
    contractType: contract?.contractType ?? null,
    importance,
    reasons: extra.reasons ?? ['patrocinio', contract?.sponsorTier, contract?.category].filter(Boolean),
    quoteSeeds: extra.quoteSeeds ?? [`${contract?.sponsorName ?? 'essa marca'} virou um capitulo publico da minha carreira`],
  }, year);
}

export function ensureSponsorMemory(player) {
  if (!player) return player;
  return { ...player, sponsorMemory: recomputeFavorites(emptyMemory(player.sponsorMemory)) };
}

export function recordSponsorSigning(player, contract, context = {}) {
  if (!player || !contract) return player;
  let memory = emptyMemory(player.sponsorMemory);
  const rank = player.rankPosition ?? 999;
  const age = player.age ?? null;
  const firstElite = contract.sponsorTier === 'ELITE' && !(memory.relationships ?? []).some(m => m.sponsorTier === 'ELITE');
  const isBreakthrough = firstElite || contract.annualFee >= 3_000_000 || (age && age <= 21 && contract.sponsorTier !== 'ENTRY');
  const campaign = contract.campaignConcept?.hook ?? contract.clauses?.headline ?? null;

  memory = add(memory, 'relationships', baseEntry(player, contract, 'brand_relationship', 'connection', {
    label: contract.sponsorName,
    age,
    rankAtSigning: rank,
    contractType: contract.contractType,
    clauseSummary: contract.clauseSummary ?? null,
    reasons: ['contrato assinado', contract.sponsorTier, contract.category].filter(Boolean),
    quoteSeeds: [`${contract.sponsorName} entrou na minha carreira num momento importante`],
  }));

  if (isBreakthrough) {
    memory = add(memory, 'breakthroughs', baseEntry(player, contract, 'commercial_breakthrough', 'pride', {
      label: `${contract.sponsorName} (${fmtMoney(contract.annualFee)}/ano)`,
      age,
      rankAtSigning: rank,
      reasons: [firstElite ? 'primeiro contrato elite' : null, 'mudanca de patamar comercial'].filter(Boolean),
      quoteSeeds: [
        firstElite
          ? `${contract.sponsorName} foi a primeira marca que me fez sentir que eu tinha virado um rosto global`
          : `aquele acordo com ${contract.sponsorName} mudou meu patamar fora da quadra`,
      ],
    }));
  }

  if (campaign) {
    memory = add(memory, 'campaigns', baseEntry(player, contract, 'campaign_memory', 'spotlight', {
      label: `${contract.sponsorName}: ${campaign}`,
      campaign,
      activation: contract.clauses?.activation ?? null,
      reasons: ['campanha de marca', contract.clauses?.activation?.campaignScope].filter(Boolean),
      quoteSeeds: [`a campanha de ${campaign} com ${contract.sponsorName} marcou aquela fase`],
    }));
  }

  let updated = { ...player, sponsorMemory: recomputeFavorites({ ...memory, lastUpdatedYear: context.year ?? contract.seasonSigned ?? memory.lastUpdatedYear }) };
  if (isBreakthrough) {
    updated = withBusinessLifeMemory(updated, contract, 'sponsor_breakthrough_life', 'pride', context, {
      label: `${contract.sponsorName} mudou meu patamar público`,
      force: true,
      reasons: [firstElite ? 'primeiro patrocinio elite' : 'virada comercial', contract.sponsorTier].filter(Boolean),
      quoteSeeds: [`${contract.sponsorName} foi quando percebi que minha imagem tinha virado algo maior que resultado`],
    });
  }
  if (campaign) {
    updated = withBusinessLifeMemory(updated, contract, 'sponsor_campaign_life', 'spotlight', context, {
      label: `${contract.sponsorName}: ${campaign}`,
      campaign,
      minImportance: 45,
      reasons: ['campanha publica', contract.clauses?.activation?.campaignScope].filter(Boolean),
      quoteSeeds: [`a campanha ${campaign} com ${contract.sponsorName} ficou grudada naquela fase da minha vida`],
    });
  }
  return updated;
}

export function recordSponsorRenewal(player, oldContract, newContract, context = {}) {
  if (!player || !newContract) return player;
  let memory = emptyMemory(player.sponsorMemory);
  memory = add(memory, 'loyalties', baseEntry(player, newContract, 'brand_loyalty', 'trust', {
    label: `${newContract.sponsorName} renovou`,
    oldFee: oldContract?.annualFee ?? null,
    newFee: newContract.annualFee,
    reasons: ['renovacao', newContract.annualFee > (oldContract?.annualFee ?? 0) ? 'contrato maior' : 'continuidade'],
    quoteSeeds: [`renovar com ${newContract.sponsorName} teve peso porque ali ja existia historia`],
    year: context.year ?? newContract.seasonSigned,
  }));
  let updated = { ...player, sponsorMemory: recomputeFavorites({ ...memory, lastUpdatedYear: context.year ?? newContract.seasonSigned ?? memory.lastUpdatedYear }) };
  updated = withBusinessLifeMemory(updated, newContract, 'sponsor_loyalty_life', 'trust', context, {
    label: `${newContract.sponsorName} renovou confiança`,
    minImportance: 56,
    reasons: ['renovacao comercial', newContract.annualFee > (oldContract?.annualFee ?? 0) ? 'contrato maior' : 'continuidade'],
    quoteSeeds: [`renovar com ${newContract.sponsorName} teve peso porque a relacao ja fazia parte da minha historia`],
  });
  return updated;
}

export function recordSponsorTermination(player, contract, reason = 'EXPIRED', context = {}) {
  if (!player || !contract) return player;
  let memory = emptyMemory(player.sponsorMemory);
  const painful = ['SCANDAL', 'PERFORMANCE_DROP', 'INJURY_LONG'].includes(reason) || contract.sponsorTier === 'ELITE';
  memory = add(memory, painful ? 'scars' : 'relationships', baseEntry(player, contract, painful ? 'brand_scar' : 'brand_chapter_closed', painful ? 'scar' : 'closure', {
    label: `${contract.sponsorName} encerrou parceria`,
    terminationReason: reason,
    reasons: ['fim de contrato', reason].filter(Boolean),
    quoteSeeds: [
      painful
        ? `perder ${contract.sponsorName} me ensinou como o mercado pode ser frio`
        : `quando acabou com ${contract.sponsorName}, ficou a sensacao de ciclo completo`,
    ],
    year: context.year ?? contract.terminatedYear ?? contract.seasonSigned,
  }));
  let updated = { ...player, sponsorMemory: recomputeFavorites({ ...memory, lastUpdatedYear: context.year ?? contract.terminatedYear ?? memory.lastUpdatedYear }) };
  if (painful) {
    updated = withBusinessLifeMemory(updated, contract, 'sponsor_scar_life', 'scar', context, {
      label: `${contract.sponsorName} saiu da minha vida pública`,
      force: true,
      reasons: ['ruptura comercial', reason].filter(Boolean),
      quoteSeeds: [`perder ${contract.sponsorName} tambem mexeu com minha vida fora da quadra`],
    });
  }
  return updated;
}

export function summarizeSponsorMemory(player) {
  const sm = player?.sponsorMemory;
  if (!sm) return '';
  return [
    sm.favorites?.brand ? `Marca marcante: ${sm.favorites.brand.sponsorName}` : null,
    sm.favorites?.breakthrough ? `Virada comercial: ${sm.favorites.breakthrough.label}` : null,
    sm.favorites?.campaign ? `Campanha: ${sm.favorites.campaign.campaign}` : null,
    sm.favorites?.scar ? `Cicatriz comercial: ${sm.favorites.scar.sponsorName}` : null,
  ].filter(Boolean).join(' | ');
}
