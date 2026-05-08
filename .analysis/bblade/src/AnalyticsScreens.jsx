// AnalyticsScreens.jsx - Telas de Analytics da Fase 3
// AnalyticsDashboard, PlayerAnalyticsScreen, MetaDashboard, RecordBookScreen, BalanceReportScreen

import React, { useState, useMemo } from 'react';
import './AnalyticsScreens.css';

// ==================== ANALYTICS DASHBOARD ====================
export function AnalyticsDashboard({ universe, onPlayerSelect }) {
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedTier, setSelectedTier] = useState('all');

  const typeDistribution = useMemo(() => {
    const season = selectedSeason === 'all' ? null : parseInt(selectedSeason);
    return universe.analytics.getTypeDistribution(season);
  }, [universe.analytics, selectedSeason]);

  const arenaStats = useMemo(() => {
    return universe.analytics.getArenaWinRates();
  }, [universe.analytics]);

  const topPlayers = useMemo(() => {
    return [...universe.players]
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 10);
  }, [universe.players]);

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h1>📊 Analytics Dashboard</h1>
        <div className="filters">
          <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
            <option value="all">All Seasons</option>
            {Array.from({ length: universe.season }, (_, i) => (
              <option key={i + 1} value={i + 1}>Season {i + 1}</option>
            ))}
          </select>
          <select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)}>
            <option value="all">All Tiers</option>
            <option value="Grand Slam">Grand Slam</option>
            <option value="Masters">Masters</option>
            <option value="Challengers">Challengers</option>
            <option value="Prospects">Prospects</option>
          </select>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Type Meta Card */}
        <div className="dashboard-card">
          <h3>Type Distribution</h3>
          <div className="type-stats">
            {Object.entries(typeDistribution).map(([type, stats]) => (
              <div key={type} className="type-stat-row">
                <div className="type-label">
                  <span className={`type-badge ${type.toLowerCase()}`}>{type}</span>
                </div>
                <div className="type-bars">
                  <div className="stat-bar">
                    <label>Pick Rate</label>
                    <div className="bar-container">
                      <div 
                        className="bar-fill" 
                        style={{ width: `${stats.pickRate}%`, backgroundColor: '#4CAF50' }}
                      />
                      <span className="bar-value">{stats.pickRate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="stat-bar">
                    <label>Win Rate</label>
                    <div className="bar-container">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${stats.winRate}%`, 
                          backgroundColor: stats.winRate > 52 ? '#FF9800' : stats.winRate < 48 ? '#F44336' : '#2196F3'
                        }}
                      />
                      <span className="bar-value">{stats.winRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Players Card */}
        <div className="dashboard-card">
          <h3>Top 10 Rankings</h3>
          <div className="rankings-list">
            {topPlayers.map((player, idx) => (
              <div 
                key={player.name} 
                className="ranking-row"
                onClick={() => onPlayerSelect(player.name)}
              >
                <div className="rank-medal">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                </div>
                <div className="player-info">
                  <div className="player-name">{player.name}</div>
                  <div className="player-country">{player.country}</div>
                </div>
                <div className="player-elo">{Math.round(player.elo)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Arena Performance Card */}
        <div className="dashboard-card full-width">
          <h3>Arena Performance Matrix</h3>
          <div className="arena-matrix">
            <table>
              <thead>
                <tr>
                  <th>Arena</th>
                  <th>Attack</th>
                  <th>Defense</th>
                  <th>Stamina</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(arenaStats).map(([arena, stats]) => (
                  <tr key={arena}>
                    <td className="arena-name">{arena}</td>
                    {['Attack', 'Defense', 'Stamina', 'Balance'].map(type => {
                      const wr = stats[type].winRate;
                      const color = wr > 60 ? '#4CAF50' : wr > 50 ? '#FFC107' : wr > 40 ? '#FF9800' : '#F44336';
                      return (
                        <td key={type} style={{ backgroundColor: `${color}20`, color }}>
                          {wr.toFixed(1)}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== PLAYER ANALYTICS SCREEN ====================
export function PlayerAnalyticsScreen({ universe, playerName, onBack }) {
  const [selectedTab, setSelectedTab] = useState('overview');
  
  const player = universe.players.find(p => p.name === playerName);
  const career = universe.careerSystem.getCareer(playerName);
  const eloHistory = universe.analytics.getEloHistory(playerName);
  const formCurve = universe.analytics.getFormCurve(playerName, 30);
  const clutchStats = universe.analytics.getClutchStats(playerName);
  const arenaSpec = universe.analytics.getArenaSpecialization(playerName);
  const h2hMatrix = universe.analytics.getHeadToHeadMatrix();

  if (!player || !career) {
    return <div className="player-analytics error">Player not found</div>;
  }

  const playerH2H = h2hMatrix[playerName] || {};
  const rivals = Object.entries(playerH2H)
    .filter(([name]) => name !== playerName)
    .sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))
    .slice(0, 10);

  return (
    <div className="player-analytics-screen">
      <div className="player-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <div className="player-title">
          <h1>{player.name}</h1>
          <div className="player-meta">
            <span>{player.country}</span>
            <span>•</span>
            <span>Level {career.level}</span>
            <span>•</span>
            <span>{Math.round(player.elo)} ELO</span>
          </div>
        </div>
      </div>

      <div className="analytics-tabs">
        <button 
          className={selectedTab === 'overview' ? 'active' : ''} 
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button 
          className={selectedTab === 'career' ? 'active' : ''} 
          onClick={() => setSelectedTab('career')}
        >
          Career
        </button>
        <button 
          className={selectedTab === 'h2h' ? 'active' : ''} 
          onClick={() => setSelectedTab('h2h')}
        >
          Head-to-Head
        </button>
        <button 
          className={selectedTab === 'arenas' ? 'active' : ''} 
          onClick={() => setSelectedTab('arenas')}
        >
          Arenas
        </button>
      </div>

      <div className="analytics-content">
        {selectedTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Matches Played</div>
                <div className="stat-value">{career.matchCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Titles Won</div>
                <div className="stat-value">{career.titleCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Comebacks</div>
                <div className="stat-value">{career.comebacks}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Perfect Games</div>
                <div className="stat-value">{career.perfectGames}</div>
              </div>
            </div>

            <div className="chart-section">
              <h3>ELO History</h3>
              <div className="elo-chart">
                {eloHistory.length > 0 && (
                  <svg width="100%" height="200" viewBox="0 0 800 200">
                    <polyline
                      fill="none"
                      stroke="#2196F3"
                      strokeWidth="2"
                      points={eloHistory.map((point, idx) => {
                        const x = (idx / eloHistory.length) * 800;
                        const y = 200 - ((point.elo - 1200) / 800) * 200;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    {eloHistory.map((point, idx) => {
                      const x = (idx / eloHistory.length) * 800;
                      const y = 200 - ((point.elo - 1200) / 800) * 200;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="3"
                          fill={point.result === 'W' ? '#4CAF50' : '#F44336'}
                        />
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>

            <div className="chart-section">
              <h3>Form Curve (Last 30 Matches)</h3>
              <div className="form-chart">
                {formCurve.map((point, idx) => (
                  <div 
                    key={idx} 
                    className="form-bar"
                    style={{ 
                      height: `${point.winRate}%`,
                      backgroundColor: point.result === 'W' ? '#4CAF50' : '#F44336'
                    }}
                    title={`Match ${point.match}: ${point.winRate.toFixed(1)}% WR`}
                  />
                ))}
              </div>
            </div>

            <div className="clutch-section">
              <h3>Clutch Performance</h3>
              <div className="clutch-stats">
                <div>Match Points Saved: <strong>{clutchStats.matchPointsSaved}</strong></div>
                <div>Comebacks: <strong>{clutchStats.comebacks}</strong></div>
                <div>Clutch Wins: <strong>{clutchStats.clutchWins}</strong></div>
                <div>Clutch Rate: <strong>{clutchStats.clutchRate.toFixed(1)}%</strong></div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'career' && (
          <div className="career-tab">
            <div className="xp-section">
              <h3>Level Progress</h3>
              <div className="xp-bar">
                <div className="xp-info">
                  <span>Level {career.level}</span>
                  <span>{career.experiencePoints} / {career.level * 100} XP</span>
                </div>
                <div className="xp-progress">
                  <div 
                    className="xp-fill" 
                    style={{ width: `${(career.experiencePoints / (career.level * 100)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="skills-section">
              <h3>Skills</h3>
              <div className="skills-grid">
                {Object.entries(career.skills).map(([skill, level]) => (
                  <div key={skill} className="skill-row">
                    <div className="skill-name">{skill}</div>
                    <div className="skill-level">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div 
                          key={i} 
                          className={`skill-dot ${i < level ? 'filled' : ''}`}
                        />
                      ))}
                      <span className="skill-value">{level}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="milestones-section">
              <h3>Milestones ({career.milestones.length})</h3>
              <div className="milestones-list">
                {career.milestones.slice().reverse().map((milestone, idx) => (
                  <div key={idx} className="milestone-item">
                    <div className="milestone-icon">
                      {milestone.type === 'achievement' ? '🏆' : 
                       milestone.type === 'level_up' ? '⬆️' : '⭐'}
                    </div>
                    <div className="milestone-content">
                      <div className="milestone-title">{milestone.title}</div>
                      <div className="milestone-desc">{milestone.description}</div>
                      <div className="milestone-date">Season {milestone.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'h2h' && (
          <div className="h2h-tab">
            <h3>Head-to-Head Records</h3>
            <div className="h2h-list">
              {rivals.map(([opponentName, record]) => {
                const total = record.wins + record.losses;
                return (
                  <div key={opponentName} className="h2h-row">
                    <div className="h2h-player">{opponentName}</div>
                    <div className="h2h-record">
                      <span className="wins">{record.wins}W</span>
                      <span className="losses">{record.losses}L</span>
                    </div>
                    <div className="h2h-bar">
                      <div 
                        className="h2h-win-bar" 
                        style={{ width: `${record.winRate}%` }}
                      />
                      <span className="h2h-percentage">{record.winRate.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedTab === 'arenas' && (
          <div className="arenas-tab">
            <h3>Arena Specialization</h3>
            {arenaSpec.best && (
              <div className="arena-highlight best">
                <div className="highlight-label">Best Arena</div>
                <div className="highlight-name">{arenaSpec.best.arena}</div>
                <div className="highlight-stat">{arenaSpec.best.winRate.toFixed(1)}% WR</div>
                <div className="highlight-matches">({arenaSpec.best.wins}/{arenaSpec.best.matches})</div>
              </div>
            )}
            {arenaSpec.worst && (
              <div className="arena-highlight worst">
                <div className="highlight-label">Worst Arena</div>
                <div className="highlight-name">{arenaSpec.worst.arena}</div>
                <div className="highlight-stat">{arenaSpec.worst.winRate.toFixed(1)}% WR</div>
                <div className="highlight-matches">({arenaSpec.worst.wins}/{arenaSpec.worst.matches})</div>
              </div>
            )}
            <div className="arena-breakdown">
              {Object.entries(arenaSpec.byArena).map(([arena, stats]) => (
                <div key={arena} className="arena-stat-row">
                  <div className="arena-name">{arena}</div>
                  <div className="arena-record">{stats.wins}W - {stats.matches - stats.wins}L</div>
                  <div className="arena-wr">{stats.winRate.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== META DASHBOARD ====================
export function MetaDashboard({ universe }) {
  const [timeRange, setTimeRange] = useState(3);
  
  const trends = universe.analytics.getMetaTrends(timeRange);
  const partUsage = universe.analytics.getPartUsageRate();
  const comboEffectiveness = universe.analytics.getComboEffectiveness();

  const topLayers = Object.entries(partUsage.layers)
    .sort((a, b) => b[1].rate - a[1].rate)
    .slice(0, 10);

  const topCombos = Object.entries(comboEffectiveness).slice(0, 10);

  return (
    <div className="meta-dashboard">
      <div className="meta-header">
        <h1>🎯 Meta Analysis</h1>
        <select value={timeRange} onChange={(e) => setTimeRange(parseInt(e.target.value))}>
          <option value={3}>Last 3 Seasons</option>
          <option value={5}>Last 5 Seasons</option>
          <option value={10}>Last 10 Seasons</option>
        </select>
      </div>

      <div className="meta-content">
        <div className="meta-section">
          <h3>Type Meta Trends</h3>
          <div className="trend-chart">
            <svg width="100%" height="300" viewBox="0 0 800 300">
              <g>
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(y => (
                  <line 
                    key={y} 
                    x1="0" 
                    y1={300 - (y / 100 * 300)} 
                    x2="800" 
                    y2={300 - (y / 100 * 300)}
                    stroke="#ddd"
                    strokeWidth="1"
                  />
                ))}
                
                {/* Type lines */}
                {['Attack', 'Defense', 'Stamina', 'Balance'].map((type, typeIdx) => {
                  const colors = ['#FF5722', '#2196F3', '#4CAF50', '#FFC107'];
                  const points = trends.map((point, idx) => {
                    const x = (idx / (trends.length - 1 || 1)) * 800;
                    const y = 300 - ((point[type] / 100) * 300);
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <polyline
                      key={type}
                      fill="none"
                      stroke={colors[typeIdx]}
                      strokeWidth="3"
                      points={points}
                    />
                  );
                })}
              </g>
            </svg>
            <div className="trend-legend">
              {['Attack', 'Defense', 'Stamina', 'Balance'].map((type, idx) => {
                const colors = ['#FF5722', '#2196F3', '#4CAF50', '#FFC107'];
                return (
                  <div key={type} className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: colors[idx] }} />
                    <span>{type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="meta-section">
          <h3>Top Layers by Usage</h3>
          <div className="usage-chart">
            {topLayers.map(([layer, data]) => (
              <div key={layer} className="usage-bar">
                <div className="usage-label">{layer}</div>
                <div className="usage-meter">
                  <div 
                    className="usage-fill" 
                    style={{ width: `${data.rate}%` }}
                  />
                  <span className="usage-value">{data.rate.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="meta-section">
          <h3>Top Combos by Effectiveness</h3>
          <div className="combo-list">
            {topCombos.map(([combo, stats], idx) => (
              <div key={combo} className="combo-row">
                <div className="combo-rank">{idx + 1}</div>
                <div className="combo-parts">{combo}</div>
                <div className="combo-stats">
                  <span className="combo-wr">{stats.winRate.toFixed(1)}% WR</span>
                  <span className="combo-matches">({stats.matches} matches)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== RECORD BOOK SCREEN ====================
export function RecordBookScreen({ universe, onPlayerSelect }) {
  const records = universe.analytics.getRecordBook();

  const recordCategories = [
    {
      title: 'Championships',
      records: [
        { label: 'Most Titles', value: records.mostTitles.player, stat: records.mostTitles.count }
      ]
    },
    {
      title: 'Win Records',
      records: [
        { label: 'Most Wins', value: records.mostWins.player, stat: records.mostWins.wins },
        { label: 'Best Win Rate', value: records.bestWinRate.player, stat: `${records.bestWinRate.winRate.toFixed(1)}%` },
        { label: 'Longest Streak', value: records.longestStreak.player, stat: records.longestStreak.streak }
      ]
    },
    {
      title: 'Performance',
      records: [
        { label: 'Highest ELO', value: records.highestElo.player, stat: Math.round(records.highestElo.elo) }
      ]
    }
  ];

  return (
    <div className="record-book-screen">
      <h1>📖 Record Book</h1>
      
      <div className="records-grid">
        {recordCategories.map(category => (
          <div key={category.title} className="record-category">
            <h2>{category.title}</h2>
            <div className="record-list">
              {category.records.map(record => (
                <div key={record.label} className="record-item">
                  <div className="record-label">{record.label}</div>
                  <div 
                    className="record-holder"
                    onClick={() => onPlayerSelect(record.value)}
                  >
                    {record.value}
                  </div>
                  <div className="record-stat">{record.stat}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="historical-section">
        <h2>Historical Comparisons</h2>
        <div className="decade-comparison">
          {/* Placeholder for decade comparison */}
          <p>Decade-by-decade statistics coming soon...</p>
        </div>
      </div>
    </div>
  );
}

// ==================== BALANCE REPORT SCREEN ====================
export function BalanceReportScreen({ universe }) {
  const health = universe.balanceEngine.analyzeMetaHealth();
  const currentPatch = universe.balanceEngine.getCurrentPatch();
  const patchHistory = universe.balanceEngine.getPatchHistory();

  const getHealthColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFC107';
    return '#F44336';
  };

  return (
    <div className="balance-report-screen">
      <h1>⚖️ Balance Report</h1>

      <div className="balance-header">
        <div className="health-score">
          <div className="score-circle" style={{ borderColor: getHealthColor(health.overallScore) }}>
            <div className="score-value">{health.overallScore.toFixed(0)}</div>
            <div className="score-label">Health Score</div>
          </div>
        </div>
        <div className="patch-info">
          <div className="current-patch">Current Patch: {currentPatch.version}</div>
          <div className="total-patches">Total Patches: {patchHistory.length}</div>
        </div>
      </div>

      {health.issues.length > 0 && (
        <div className="issues-section">
          <h2>Current Issues</h2>
          <div className="issues-list">
            {health.issues.map((issue, idx) => (
              <div key={idx} className={`issue-item ${issue.severity}`}>
                <div className="issue-severity">
                  {issue.severity === 'critical' ? '🔴' :
                   issue.severity === 'high' ? '🟠' :
                   issue.severity === 'medium' ? '🟡' : '🟢'}
                </div>
                <div className="issue-message">{issue.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {health.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h2>Recommendations</h2>
          <div className="recommendations-list">
            {health.recommendations.map((rec, idx) => (
              <div key={idx} className="recommendation-item">
                <div className="rec-priority">{rec.priority}</div>
                <div className="rec-content">
                  <div className="rec-target">{rec.target}</div>
                  <div className="rec-change">{rec.change}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="balance-details">
        <h2>Detailed Analysis</h2>
        
        <div className="balance-grid">
          <div className="balance-card">
            <h3>Type Balance</h3>
            <div className="score-badge" style={{ backgroundColor: getHealthColor(health.typeBalance.score) }}>
              {health.typeBalance.score.toFixed(0)}
            </div>
            {Object.entries(health.typeBalance.data).map(([type, data]) => (
              <div key={type} className="type-balance-row">
                <span className={`type-badge ${type.toLowerCase()}`}>{type}</span>
                <span className={`status-badge ${data.status}`}>{data.status}</span>
                <span className="wr-value">{data.winRate.toFixed(1)}% WR</span>
              </div>
            ))}
          </div>

          <div className="balance-card">
            <h3>Part Diversity</h3>
            <div className="score-badge" style={{ backgroundColor: getHealthColor(health.partDiversity.score) }}>
              {health.partDiversity.score.toFixed(0)}
            </div>
            {/* Top usage parts */}
            {Object.entries(health.partDiversity.data.layers).slice(0, 5).map(([part, data]) => (
              <div key={part} className="part-diversity-row">
                <span className="part-name">{part}</span>
                <span className={`status-badge ${data.status}`}>{data.usage.toFixed(1)}%</span>
              </div>
            ))}
          </div>

          <div className="balance-card">
            <h3>Arena Fairness</h3>
            <div className="score-badge" style={{ backgroundColor: getHealthColor(health.arenaFairness.score) }}>
              {health.arenaFairness.score.toFixed(0)}
            </div>
          </div>

          <div className="balance-card">
            <h3>Combo Centralization</h3>
            <div className="score-badge" style={{ backgroundColor: getHealthColor(health.comboCentralization.score) }}>
              {health.comboCentralization.score.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {patchHistory.length > 0 && (
        <div className="patch-history-section">
          <h2>Patch History</h2>
          <div className="patch-timeline">
            {patchHistory.slice().reverse().map((patch, idx) => (
              <div key={idx} className="patch-item">
                <div className="patch-header">
                  <div className="patch-version">v{patch.version}</div>
                  <div className="patch-season">Season {patch.season}</div>
                </div>
                <div className="patch-changes">
                  {patch.changes.map((change, cIdx) => (
                    <div key={cIdx} className="change-item">
                      {change.description}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
