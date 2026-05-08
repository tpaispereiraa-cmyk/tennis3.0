// NarrativeScreens.jsx - Telas de Narrativa
// Visualização de rivalidades, eventos, social media e legado

import React, { useState } from 'react';

// ==================== RIVALRY TRACKER SCREEN ====================
export const RivalryTrackerScreen = ({ rivalries, universe, onBack }) => {
  const [selectedRivalry, setSelectedRivalry] = useState(null);

  if (!rivalries || rivalries.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={onBack} style={styles.backButton}>← Back</button>
          <h2 style={styles.title}>⚔️ Rivalry Tracker</h2>
        </div>
        <div style={styles.emptyState}>
          <p>No rivalries detected yet.</p>
          <p style={styles.subtitle}>Rivalries emerge as players face each other repeatedly.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back</button>
        <h2 style={styles.title}>⚔️ Rivalry Tracker</h2>
      </div>

      <div style={styles.rivalriesList}>
        {rivalries.map((rivalry, idx) => (
          <div
            key={idx}
            style={{
              ...styles.rivalryCard,
              ...(selectedRivalry === idx ? styles.rivalryCardSelected : {})
            }}
            onClick={() => setSelectedRivalry(selectedRivalry === idx ? null : idx)}
          >
            <div style={styles.rivalryHeader}>
              <div style={styles.rivalryPlayers}>
                <span style={styles.playerName}>{rivalry.player1.id}</span>
                <span style={styles.vs}>VS</span>
                <span style={styles.playerName}>{rivalry.player2.id}</span>
              </div>
              <div style={styles.rivalryType}>
                {getRivalryIcon(rivalry.type)} {rivalry.type}
              </div>
            </div>

            <div style={styles.recordSection}>
              <div style={styles.record}>
                <span style={styles.recordLabel}>Series:</span>
                <span style={styles.recordValue}>
                  {rivalry.player1.wins}-{rivalry.player2.wins}
                </span>
              </div>
              <div style={styles.meetings}>
                {rivalry.totalMeetings} meetings
              </div>
            </div>

            <div style={styles.intensityBar}>
              <div style={styles.intensityLabel}>
                Intensity: {(rivalry.intensity * 100).toFixed(0)}%
              </div>
              <div style={styles.intensityBarBg}>
                <div
                  style={{
                    ...styles.intensityBarFill,
                    width: `${rivalry.intensity * 100}%`,
                    backgroundColor: getIntensityColor(rivalry.intensity)
                  }}
                />
              </div>
            </div>

            {selectedRivalry === idx && (
              <div style={styles.rivalryDetails}>
                <div style={styles.storyline}>
                  <strong>Storyline:</strong>
                  <p>{rivalry.storyline}</p>
                </div>

                {rivalry.keyMoments && rivalry.keyMoments.length > 0 && (
                  <div style={styles.keyMoments}>
                    <strong>Key Moments:</strong>
                    {rivalry.keyMoments.map((moment, mIdx) => (
                      <div key={mIdx} style={styles.momentCard}>
                        <span style={styles.momentType}>
                          {moment.type === 'FINAL' && '🏆'}
                          {moment.type === 'BURST' && '💥'}
                          {moment.type === 'COMEBACK' && '💪'}
                        </span>
                        <span>{moment.tournament} - {moment.round}</span>
                        <span style={styles.momentWinner}>
                          Winner: {moment.winner}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== EVENTS CALENDAR SCREEN ====================
export const EventsCalendarScreen = ({ eventsManager, universe, onBack, onExecuteEvent }) => {
  const upcomingEvents = eventsManager?.getUpcomingEvents() || [];
  const completedEvents = eventsManager?.getCompletedEvents() || [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back</button>
        <h2 style={styles.title}>📅 Special Events Calendar</h2>
      </div>

      <div style={styles.eventsContainer}>
        {/* Upcoming Events */}
        <div style={styles.eventsSection}>
          <h3 style={styles.sectionTitle}>🔜 Upcoming Events</h3>
          {upcomingEvents.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No upcoming events scheduled.</p>
            </div>
          ) : (
            <div style={styles.eventsList}>
              {upcomingEvents.map((event, idx) => (
                <div key={idx} style={styles.eventCard}>
                  <div style={styles.eventHeader}>
                    <h4 style={styles.eventName}>{event.name}</h4>
                    <span style={styles.eventType}>{event.type}</span>
                  </div>
                  
                  <p style={styles.eventDescription}>{event.description}</p>
                  
                  <div style={styles.eventDetails}>
                    <div style={styles.eventDetail}>
                      <span style={styles.detailLabel}>Format:</span>
                      <span>{event.format}</span>
                    </div>
                    <div style={styles.eventDetail}>
                      <span style={styles.detailLabel}>Participants:</span>
                      <span>{event.participants?.length || 0}</span>
                    </div>
                    <div style={styles.eventDetail}>
                      <span style={styles.detailLabel}>Stakes:</span>
                      <span>{event.stakes}</span>
                    </div>
                  </div>

                  {onExecuteEvent && (
                    <button
                      onClick={() => onExecuteEvent(event)}
                      style={styles.executeButton}
                    >
                      Execute Event
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Events */}
        {completedEvents.length > 0 && (
          <div style={styles.eventsSection}>
            <h3 style={styles.sectionTitle}>✅ Completed Events</h3>
            <div style={styles.eventsList}>
              {completedEvents.map((result, idx) => (
                <div key={idx} style={styles.eventCard}>
                  <div style={styles.eventHeader}>
                    <h4 style={styles.eventName}>{result.event.name}</h4>
                    <span style={styles.eventCompleted}>COMPLETED</span>
                  </div>
                  
                  <div style={styles.eventResults}>
                    <div style={styles.winner}>
                      🏆 Winner: {result.results.winner.name}
                    </div>
                    {result.highlights && (
                      <p style={styles.highlight}>{result.highlights.memorable}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== SOCIAL FEED SCREEN ====================
export const SocialFeedScreen = ({ socialEngine, onBack }) => {
  const [filter, setFilter] = useState('all'); // all, player, analyst, fan
  const [sortBy, setSortBy] = useState('recent'); // recent, popular

  // Mock tweets for demo (em produção viriam do socialEngine)
  const allTweets = socialEngine?.recentTweets || [];
  const trending = socialEngine?.getTrending() || [];

  const filteredTweets = allTweets.filter(tweet => {
    if (filter === 'all') return true;
    if (filter === 'player') return tweet.type?.includes('PLAYER');
    if (filter === 'analyst') return tweet.type?.includes('ANALYST');
    if (filter === 'fan') return tweet.type?.includes('FAN');
    return true;
  });

  const sortedTweets = [...filteredTweets].sort((a, b) => {
    if (sortBy === 'popular') return (b.likes || 0) - (a.likes || 0);
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back</button>
        <h2 style={styles.title}>🐦 Social Feed</h2>
      </div>

      <div style={styles.socialContainer}>
        {/* Sidebar - Trending */}
        <div style={styles.sidebar}>
          <div style={styles.trendingBox}>
            <h3 style={styles.trendingTitle}>🔥 Trending</h3>
            {trending.length === 0 ? (
              <p style={styles.noTrending}>No trending topics yet</p>
            ) : (
              <div style={styles.trendingList}>
                {trending.map((topic, idx) => (
                  <div key={idx} style={styles.trendingItem}>
                    <span style={styles.trendingTopic}>{topic.topic}</span>
                    <span style={styles.trendingCount}>{topic.count} posts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Feed */}
        <div style={styles.feedMain}>
          {/* Filters */}
          <div style={styles.filters}>
            <div style={styles.filterGroup}>
              <button
                onClick={() => setFilter('all')}
                style={filter === 'all' ? styles.filterActive : styles.filterButton}
              >
                All
              </button>
              <button
                onClick={() => setFilter('player')}
                style={filter === 'player' ? styles.filterActive : styles.filterButton}
              >
                Players
              </button>
              <button
                onClick={() => setFilter('analyst')}
                style={filter === 'analyst' ? styles.filterActive : styles.filterButton}
              >
                Analysts
              </button>
              <button
                onClick={() => setFilter('fan')}
                style={filter === 'fan' ? styles.filterActive : styles.filterButton}
              >
                Fans
              </button>
            </div>
            <div style={styles.filterGroup}>
              <button
                onClick={() => setSortBy('recent')}
                style={sortBy === 'recent' ? styles.filterActive : styles.filterButton}
              >
                Recent
              </button>
              <button
                onClick={() => setSortBy('popular')}
                style={sortBy === 'popular' ? styles.filterActive : styles.filterButton}
              >
                Popular
              </button>
            </div>
          </div>

          {/* Tweets */}
          <div style={styles.tweetsList}>
            {sortedTweets.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No tweets yet. Play some matches to generate buzz!</p>
              </div>
            ) : (
              sortedTweets.map((tweet, idx) => (
                <div key={idx} style={styles.tweetCard}>
                  <div style={styles.tweetHeader}>
                    <div style={styles.tweetAuthor}>
                      <strong>{tweet.author}</strong>
                      <span style={styles.tweetHandle}>{tweet.handle}</span>
                    </div>
                    <span style={styles.tweetTime}>
                      {formatTimestamp(tweet.timestamp)}
                    </span>
                  </div>
                  <div style={styles.tweetContent}>
                    {tweet.content}
                  </div>
                  <div style={styles.tweetEngagement}>
                    <span>❤️ {tweet.likes || 0}</span>
                    <span>🔁 {tweet.retweets || 0}</span>
                    <span>💬 {tweet.replies || 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== LEGACY SCREEN ====================
export const LegacyScreen = ({ narrativeEngine, universe, onBack }) => {
  const [selectedTab, setSelectedTab] = useState('eras'); // eras, goats, records

  const allSeasons = universe?.seasons || [];
  const eras = narrativeEngine?.eraSystem.analyzeEra(allSeasons) || [];
  const players = universe?.getActivePlayers() || [];
  const legacyTiers = narrativeEngine?.generateLegacyTiers(players, allSeasons) || [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back</button>
        <h2 style={styles.title}>🏛️ Legacy & History</h2>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setSelectedTab('eras')}
          style={selectedTab === 'eras' ? styles.tabActive : styles.tab}
        >
          Eras
        </button>
        <button
          onClick={() => setSelectedTab('goats')}
          style={selectedTab === 'goats' ? styles.tabActive : styles.tab}
        >
          GOATs
        </button>
        <button
          onClick={() => setSelectedTab('records')}
          style={selectedTab === 'records' ? styles.tabActive : styles.tab}
        >
          Records
        </button>
      </div>

      {/* Content */}
      <div style={styles.tabContent}>
        {selectedTab === 'eras' && (
          <ErasTab eras={eras} />
        )}
        {selectedTab === 'goats' && (
          <GoatsTab legacyTiers={legacyTiers} />
        )}
        {selectedTab === 'records' && (
          <RecordsTab universe={universe} />
        )}
      </div>
    </div>
  );
};

// ==================== LEGACY SUB-TABS ====================
const ErasTab = ({ eras }) => {
  if (eras.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>No eras defined yet. Play more seasons to see history unfold!</p>
      </div>
    );
  }

  return (
    <div style={styles.erasTimeline}>
      {eras.map((era, idx) => (
        <div key={idx} style={styles.eraCard}>
          <div style={styles.eraType}>
            {era.type === 'DOMINANCE' && '👑'}
            {era.type === 'GOLDEN_AGE' && '✨'}
            {era.type === 'TRANSITION' && '🔄'}
          </div>
          <h3 style={styles.eraName}>{era.name}</h3>
          {era.player && (
            <div style={styles.eraPlayer}>
              Dominated by: {era.player}
            </div>
          )}
          {era.titleCount && (
            <div style={styles.eraTitles}>
              {era.titleCount} titles
            </div>
          )}
          {era.description && (
            <p style={styles.eraDescription}>{era.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};

const GoatsTab = ({ legacyTiers }) => {
  const tierOrder = ['LEGEND', 'ELITE', 'ESTABLISHED', 'RISING'];
  
  return (
    <div style={styles.goatsContainer}>
      {tierOrder.map(tier => {
        const playersInTier = legacyTiers.filter(p => p.tier === tier);
        
        if (playersInTier.length === 0) return null;

        return (
          <div key={tier} style={styles.tierSection}>
            <h3 style={styles.tierTitle}>
              {getTierIcon(tier)} {tier}
            </h3>
            <div style={styles.tierPlayers}>
              {playersInTier.map((player, idx) => (
                <div key={idx} style={styles.goatCard}>
                  <div style={styles.goatName}>{player.player}</div>
                  {player.highlights && (
                    <div style={styles.goatHighlights}>
                      {player.highlights.map((h, hIdx) => (
                        <div key={hIdx} style={styles.highlight}>
                          <span>{h.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const RecordsTab = ({ universe }) => {
  // Mock records - em produção viriam do universe
  const records = [
    { category: 'Most Titles (Career)', holder: 'TBD', value: 0 },
    { category: 'Longest Win Streak', holder: 'TBD', value: 0 },
    { category: 'Most Burst Finishes', holder: 'TBD', value: 0 },
    { category: 'Highest Win %', holder: 'TBD', value: '0%' },
  ];

  return (
    <div style={styles.recordsContainer}>
      <h3 style={styles.recordsTitle}>📊 All-Time Records</h3>
      <div style={styles.recordsList}>
        {records.map((record, idx) => (
          <div key={idx} style={styles.recordCard}>
            <div style={styles.recordCategory}>{record.category}</div>
            <div style={styles.recordValue}>{record.value}</div>
            <div style={styles.recordHolder}>{record.holder}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== HELPER FUNCTIONS ====================
const getRivalryIcon = (type) => {
  switch(type) {
    case 'CLASSIC': return '⚔️';
    case 'GIANT_KILLER': return '🎯';
    case 'REMATCH': return '🔄';
    case 'GRUDGE': return '💥';
    default: return '⚡';
  }
};

const getIntensityColor = (intensity) => {
  if (intensity > 0.8) return '#ff4444';
  if (intensity > 0.6) return '#ff8800';
  if (intensity > 0.4) return '#ffcc00';
  return '#44ff44';
};

const getTierIcon = (tier) => {
  switch(tier) {
    case 'LEGEND': return '🏆';
    case 'ELITE': return '⭐';
    case 'ESTABLISHED': return '💫';
    case 'RISING': return '🌟';
    default: return '✨';
  }
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Just now';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// ==================== STYLES ====================
const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#0a0a0a',
    color: '#fff',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '30px',
    gap: '20px'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#888'
  },
  subtitle: {
    fontSize: '14px',
    marginTop: '10px'
  },

  // Rivalry Tracker
  rivalriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  rivalryCard: {
    backgroundColor: '#1a1a1a',
    border: '2px solid #333',
    borderRadius: '10px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  rivalryCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#222'
  },
  rivalryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  rivalryPlayers: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  playerName: {
    color: '#4CAF50'
  },
  vs: {
    color: '#ff4444',
    fontSize: '16px'
  },
  rivalryType: {
    fontSize: '14px',
    padding: '5px 10px',
    backgroundColor: '#333',
    borderRadius: '5px'
  },
  recordSection: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '15px'
  },
  record: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  recordLabel: {
    color: '#888'
  },
  recordValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff'
  },
  meetings: {
    color: '#888',
    fontSize: '14px'
  },
  intensityBar: {
    marginTop: '10px'
  },
  intensityLabel: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '5px'
  },
  intensityBarBg: {
    height: '8px',
    backgroundColor: '#333',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  intensityBarFill: {
    height: '100%',
    transition: 'width 0.3s'
  },
  rivalryDetails: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #333'
  },
  storyline: {
    marginBottom: '15px'
  },
  keyMoments: {
    marginTop: '15px'
  },
  momentCard: {
    display: 'flex',
    gap: '10px',
    padding: '8px',
    backgroundColor: '#0a0a0a',
    borderRadius: '5px',
    marginTop: '5px',
    fontSize: '14px'
  },
  momentType: {
    fontSize: '16px'
  },
  momentWinner: {
    marginLeft: 'auto',
    color: '#4CAF50'
  },

  // Events Calendar
  eventsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  eventsSection: {
    backgroundColor: '#1a1a1a',
    padding: '20px',
    borderRadius: '10px'
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '20px'
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  eventCard: {
    backgroundColor: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '15px'
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  eventName: {
    margin: 0,
    fontSize: '18px',
    color: '#4CAF50'
  },
  eventType: {
    fontSize: '12px',
    padding: '4px 8px',
    backgroundColor: '#333',
    borderRadius: '4px'
  },
  eventCompleted: {
    fontSize: '12px',
    padding: '4px 8px',
    backgroundColor: '#4CAF50',
    borderRadius: '4px',
    color: '#000'
  },
  eventDescription: {
    marginBottom: '15px',
    color: '#ccc'
  },
  eventDetails: {
    display: 'flex',
    gap: '20px',
    marginBottom: '10px'
  },
  eventDetail: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  detailLabel: {
    fontSize: '12px',
    color: '#888'
  },
  executeButton: {
    marginTop: '10px',
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  eventResults: {
    marginTop: '10px'
  },
  winner: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: '8px'
  },
  highlight: {
    fontSize: '14px',
    fontStyle: 'italic',
    color: '#ccc'
  },

  // Social Feed
  socialContainer: {
    display: 'flex',
    gap: '20px'
  },
  sidebar: {
    width: '300px',
    flexShrink: 0
  },
  trendingBox: {
    backgroundColor: '#1a1a1a',
    padding: '15px',
    borderRadius: '10px'
  },
  trendingTitle: {
    marginTop: 0,
    fontSize: '18px'
  },
  noTrending: {
    color: '#888',
    fontSize: '14px'
  },
  trendingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  trendingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px',
    backgroundColor: '#0a0a0a',
    borderRadius: '5px',
    fontSize: '14px'
  },
  trendingTopic: {
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  trendingCount: {
    color: '#888',
    fontSize: '12px'
  },
  feedMain: {
    flex: 1
  },
  filters: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
    gap: '10px',
    flexWrap: 'wrap'
  },
  filterGroup: {
    display: 'flex',
    gap: '10px'
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    border: '1px solid #333',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  filterActive: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: '#000',
    border: '1px solid #4CAF50',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  tweetsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  tweetCard: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '10px',
    padding: '15px'
  },
  tweetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px'
  },
  tweetAuthor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  tweetHandle: {
    fontSize: '14px',
    color: '#888'
  },
  tweetTime: {
    fontSize: '12px',
    color: '#888'
  },
  tweetContent: {
    marginBottom: '10px',
    lineHeight: '1.5'
  },
  tweetEngagement: {
    display: 'flex',
    gap: '20px',
    fontSize: '14px',
    color: '#888'
  },

  // Legacy
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    borderBottom: '2px solid #333'
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#888',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '16px'
  },
  tabActive: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#4CAF50',
    border: 'none',
    borderBottom: '2px solid #4CAF50',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  tabContent: {
    padding: '20px 0'
  },

  // Eras
  erasTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  eraCard: {
    backgroundColor: '#1a1a1a',
    padding: '20px',
    borderRadius: '10px',
    borderLeft: '4px solid #4CAF50'
  },
  eraType: {
    fontSize: '32px',
    marginBottom: '10px'
  },
  eraName: {
    margin: '0 0 10px 0',
    fontSize: '22px'
  },
  eraPlayer: {
    color: '#4CAF50',
    fontSize: '16px',
    marginBottom: '5px'
  },
  eraTitles: {
    color: '#888',
    fontSize: '14px',
    marginBottom: '10px'
  },
  eraDescription: {
    color: '#ccc',
    fontStyle: 'italic'
  },

  // GOATs
  goatsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  tierSection: {
    backgroundColor: '#1a1a1a',
    padding: '20px',
    borderRadius: '10px'
  },
  tierTitle: {
    marginTop: 0,
    fontSize: '20px',
    marginBottom: '15px'
  },
  tierPlayers: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '15px'
  },
  goatCard: {
    backgroundColor: '#0a0a0a',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #333'
  },
  goatName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: '10px'
  },
  goatHighlights: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    fontSize: '14px',
    color: '#ccc'
  },

  // Records
  recordsContainer: {
    backgroundColor: '#1a1a1a',
    padding: '20px',
    borderRadius: '10px'
  },
  recordsTitle: {
    marginTop: 0,
    marginBottom: '20px'
  },
  recordsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '15px'
  },
  recordCard: {
    backgroundColor: '#0a0a0a',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #333',
    textAlign: 'center'
  },
  recordCategory: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '10px'
  },
  recordValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: '10px'
  },
  recordHolder: {
    fontSize: '16px',
    color: '#fff'
  }
};

export default {
  RivalryTrackerScreen,
  EventsCalendarScreen,
  SocialFeedScreen,
  LegacyScreen
};
