export const NETPLAY_THRESHOLDS = Object.freeze({
  // tryHit (game.jsx)
  NET_VOLLEY_ZONE: 5.0,
  EMERG_MAX_DIST: 7.5,

  // TennisMovement net interception
  NET_CUT_BASE_Y: 3.1,
  NET_CUT_STYLE_DELTA: 0.7,
  NET_CUT_MIN_Y: 2.8,
  NET_CUT_MAX_Y: 3.7,
  NET_CUT_TIME_PULL_OPTIMAL: 0.05,
  NET_CUT_TIME_PULL_CROSS: 0.04,

  // retreat / lob detection
  LOB_PASS_MARGIN_Y: 0.45,
  LOB_OVERHEAD_Z_EXTRA: 0.85,
  DEEP_BOUNCE_RETREAT_EXTRA: 2.8,
  LOB_CLEAR_BEHIND_MARGIN: 1.3,
});

