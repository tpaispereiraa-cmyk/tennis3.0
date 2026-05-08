// BalanceEngine.js - Sistema de Auto-Balanceamento
// Fase 3: Meta health, patches automáticos, balanceamento

export class MetaBalancer {
  constructor(universe) {
    this.universe = universe;
    this.patchHistory = [];
    this.currentPatch = '1.0';
    this.balanceModifiers = {
      Attack: { stats: 1.0, arenaBonus: {} },
      Defense: { stats: 1.0, arenaBonus: {} },
      Stamina: { stats: 1.0, arenaBonus: {} },
      Balance: { stats: 1.0, arenaBonus: {} }
    };
  }

  analyzeMetaHealth() {
    const analytics = this.universe.analytics;
    const typeDistribution = analytics.getTypeDistribution();
    const arenaWinRates = analytics.getArenaWinRates();
    const partUsage = analytics.getPartUsageRate();

    const health = {
      typeBalance: this.checkTypeBalance(typeDistribution),
      partDiversity: this.checkPartDiversity(partUsage),
      arenaFairness: this.checkArenaFairness(arenaWinRates),
      comboCentralization: this.checkComboCentralization(),
      overallScore: 0,
      issues: [],
      recommendations: []
    };

    // Calculate overall score (0-100)
    health.overallScore = (
      health.typeBalance.score * 0.3 +
      health.partDiversity.score * 0.25 +
      health.arenaFairness.score * 0.25 +
      health.comboCentralization.score * 0.2
    );

    // Collect all issues
    health.issues = [
      ...health.typeBalance.issues,
      ...health.partDiversity.issues,
      ...health.arenaFairness.issues,
      ...health.comboCentralization.issues
    ];

    // Generate recommendations
    health.recommendations = this.generateRecommendations(health);

    return health;
  }

  checkTypeBalance(typeDistribution) {
    const result = {
      score: 100,
      issues: [],
      data: {}
    };

    Object.entries(typeDistribution).forEach(([type, stats]) => {
      result.data[type] = {
        winRate: stats.winRate,
        pickRate: stats.pickRate,
        status: 'healthy'
      };

      // Ideal win rate is 48-52%
      if (stats.winRate > 55) {
        result.score -= 15;
        result.issues.push({
          severity: 'high',
          type: 'type_balance',
          message: `${type} is overpowered (${stats.winRate.toFixed(1)}% WR)`
        });
        result.data[type].status = 'overpowered';
      } else if (stats.winRate < 45) {
        result.score -= 15;
        result.issues.push({
          severity: 'high',
          type: 'type_balance',
          message: `${type} is underpowered (${stats.winRate.toFixed(1)}% WR)`
        });
        result.data[type].status = 'underpowered';
      } else if (stats.winRate > 53 || stats.winRate < 47) {
        result.score -= 5;
        result.issues.push({
          severity: 'medium',
          type: 'type_balance',
          message: `${type} needs minor adjustment (${stats.winRate.toFixed(1)}% WR)`
        });
        result.data[type].status = 'needs_adjustment';
      }
    });

    return result;
  }

  checkPartDiversity(partUsage) {
    const result = {
      score: 100,
      issues: [],
      data: { layers: {}, discs: {}, drivers: {} }
    };

    ['layers', 'discs', 'drivers'].forEach(category => {
      const parts = partUsage[category];
      const topParts = Object.entries(parts)
        .sort((a, b) => b[1].rate - a[1].rate)
        .slice(0, 5);

      topParts.forEach(([partName, stats]) => {
        result.data[category][partName] = {
          usage: stats.rate,
          status: 'healthy'
        };

        if (stats.rate > 30) {
          result.score -= 10;
          result.issues.push({
            severity: 'high',
            type: 'part_diversity',
            message: `${partName} is overcentralized (${stats.rate.toFixed(1)}% usage)`
          });
          result.data[category][partName].status = 'overcentralized';
        } else if (stats.rate > 20) {
          result.score -= 5;
          result.issues.push({
            severity: 'medium',
            type: 'part_diversity',
            message: `${partName} is very popular (${stats.rate.toFixed(1)}% usage)`
          });
          result.data[category][partName].status = 'very_popular';
        }
      });
    });

    return result;
  }

  checkArenaFairness(arenaWinRates) {
    const result = {
      score: 100,
      issues: [],
      data: {}
    };

    Object.entries(arenaWinRates).forEach(([arena, stats]) => {
      result.data[arena] = {};

      ['Attack', 'Defense', 'Stamina', 'Balance'].forEach(type => {
        const winRate = stats[type].winRate;
        result.data[arena][type] = {
          winRate,
          status: 'fair'
        };

        if (winRate > 65) {
          result.score -= 10;
          result.issues.push({
            severity: 'high',
            type: 'arena_fairness',
            message: `${type} dominates ${arena} arena (${winRate.toFixed(1)}% WR)`
          });
          result.data[arena][type].status = 'dominates';
        } else if (winRate < 35) {
          result.score -= 10;
          result.issues.push({
            severity: 'high',
            type: 'arena_fairness',
            message: `${type} struggles in ${arena} arena (${winRate.toFixed(1)}% WR)`
          });
          result.data[arena][type].status = 'struggles';
        }
      });
    });

    return result;
  }

  checkComboCentralization() {
    const analytics = this.universe.analytics;
    const comboEffectiveness = analytics.getComboEffectiveness();

    const result = {
      score: 100,
      issues: [],
      data: {}
    };

    Object.entries(comboEffectiveness).slice(0, 10).forEach(([combo, stats]) => {
      result.data[combo] = {
        winRate: stats.winRate,
        matches: stats.matches,
        status: 'balanced'
      };

      if (stats.matches > 50 && stats.winRate > 65) {
        result.score -= 15;
        result.issues.push({
          severity: 'critical',
          type: 'combo_centralization',
          message: `${combo} is too dominant (${stats.winRate.toFixed(1)}% WR in ${stats.matches} matches)`
        });
        result.data[combo].status = 'dominant';
      }
    });

    return result;
  }

  generateRecommendations(health) {
    const recommendations = [];

    // Type balance recommendations
    health.typeBalance.issues.forEach(issue => {
      const type = issue.message.split(' ')[0];
      
      if (issue.message.includes('overpowered')) {
        recommendations.push({
          type: 'nerf',
          target: type,
          change: 'Reduce base stats by 5-10%',
          priority: 'high'
        });
      } else if (issue.message.includes('underpowered')) {
        recommendations.push({
          type: 'buff',
          target: type,
          change: 'Increase base stats by 5-10% or improve arena bonuses',
          priority: 'high'
        });
      }
    });

    // Arena recommendations
    health.arenaFairness.issues.forEach(issue => {
      if (issue.message.includes('dominates')) {
        const [type, , , arena] = issue.message.split(' ');
        recommendations.push({
          type: 'arena_nerf',
          target: `${type} in ${arena}`,
          change: 'Reduce arena bonus or adjust mechanics',
          priority: 'medium'
        });
      }
    });

    // Part diversity recommendations
    health.partDiversity.issues.forEach(issue => {
      if (issue.message.includes('overcentralized')) {
        const part = issue.message.split(' ')[0];
        recommendations.push({
          type: 'introduce_counter',
          target: part,
          change: 'Introduce new parts that counter this strategy',
          priority: 'medium'
        });
      }
    });

    return recommendations;
  }

  generatePatchNotes(health) {
    const patchNotes = {
      version: this.getNextPatchVersion(),
      date: new Date().toISOString(),
      season: this.universe.season,
      changes: [],
      reasoning: []
    };

    health.recommendations.forEach(rec => {
      if (rec.priority === 'high') {
        const change = this.createPatchChange(rec);
        if (change) {
          patchNotes.changes.push(change);
          patchNotes.reasoning.push({
            issue: health.issues.find(i => i.message.includes(rec.target)),
            solution: change
          });
        }
      }
    });

    return patchNotes;
  }

  createPatchChange(recommendation) {
    switch (recommendation.type) {
      case 'nerf':
        return {
          type: 'stat_adjustment',
          target: recommendation.target,
          modifier: -0.05,
          description: `${recommendation.target} base stats reduced by 5%`
        };
      
      case 'buff':
        return {
          type: 'stat_adjustment',
          target: recommendation.target,
          modifier: 0.05,
          description: `${recommendation.target} base stats increased by 5%`
        };
      
      case 'arena_nerf':
        return {
          type: 'arena_adjustment',
          target: recommendation.target,
          modifier: -0.1,
          description: `Reduced ${recommendation.target} advantage`
        };
      
      default:
        return null;
    }
  }

  applyPatch(patchNotes) {
    patchNotes.changes.forEach(change => {
      if (change.type === 'stat_adjustment') {
        const currentMod = this.balanceModifiers[change.target].stats;
        this.balanceModifiers[change.target].stats = currentMod + change.modifier;
      } else if (change.type === 'arena_adjustment') {
        // Parse target: "Attack in Standard"
        const [type, , arena] = change.target.split(' ');
        if (!this.balanceModifiers[type].arenaBonus[arena]) {
          this.balanceModifiers[type].arenaBonus[arena] = 0;
        }
        this.balanceModifiers[type].arenaBonus[arena] += change.modifier;
      }
    });

    this.patchHistory.push(patchNotes);
    this.currentPatch = patchNotes.version;

    return {
      success: true,
      message: `Patch ${patchNotes.version} applied successfully`,
      changes: patchNotes.changes.length
    };
  }

  getNextPatchVersion() {
    const [major, minor] = this.currentPatch.split('.').map(Number);
    return `${major}.${minor + 1}`;
  }

  seasonReview() {
    const health = this.analyzeMetaHealth();
    const report = {
      season: this.universe.season,
      health: health.overallScore,
      issues: health.issues,
      needsPatch: health.overallScore < 70,
      patchApplied: false
    };

    if (report.needsPatch && health.issues.some(i => i.severity === 'high' || i.severity === 'critical')) {
      const patchNotes = this.generatePatchNotes(health);
      if (patchNotes.changes.length > 0) {
        this.applyPatch(patchNotes);
        report.patchApplied = true;
        report.patch = patchNotes;
      }
    }

    return report;
  }

  getBalanceModifier(type, arena = null) {
    let modifier = this.balanceModifiers[type].stats;
    
    if (arena && this.balanceModifiers[type].arenaBonus[arena]) {
      modifier += this.balanceModifiers[type].arenaBonus[arena];
    }

    return modifier;
  }

  getPatchHistory() {
    return this.patchHistory;
  }

  getCurrentPatch() {
    return {
      version: this.currentPatch,
      modifiers: this.balanceModifiers
    };
  }

  resetBalance() {
    this.balanceModifiers = {
      Attack: { stats: 1.0, arenaBonus: {} },
      Defense: { stats: 1.0, arenaBonus: {} },
      Stamina: { stats: 1.0, arenaBonus: {} },
      Balance: { stats: 1.0, arenaBonus: {} }
    };
    this.currentPatch = '1.0';
    this.patchHistory = [];
  }
}
