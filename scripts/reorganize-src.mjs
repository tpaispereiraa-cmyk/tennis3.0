import fs from 'fs';
import path from 'path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');

const moveMap = {
  'ai.js': 'systems/ai/ai.js',
  'aiCoefficients.js': 'systems/ai/aiCoefficients.js',
  'appTheme.css': 'styles/appTheme.css',
  'arvoredetalentos.jsx': 'systems/progression/arvoredetalentos.jsx',
  'attributes.js': 'domain/players/attributes.js',
  'ballOutputEngine.js': 'systems/shots/ballOutputEngine.js',
  'BiographyEngine.js': 'systems/press/BiographyEngine.js',
  'BreakingNewsSystem.js': 'systems/press/BreakingNewsSystem.js',
  'ChronicleEngine.js': 'systems/press/ChronicleEngine.js',
  'ChronicleView.jsx': 'ui/press/ChronicleView.jsx',
  'CircuitPerceptions.js': 'systems/circuit/CircuitPerceptions.js',
  'CoachAdvisor.js': 'systems/coaches/CoachAdvisor.js',
  'CoachAnalyzer.js': 'systems/coaches/CoachAnalyzer.js',
  'CoachArchetypes.js': 'systems/coaches/CoachArchetypes.js',
  'CoachContractSystem.js': 'systems/coaches/CoachContractSystem.js',
  'CoachInfluencer.js': 'systems/coaches/CoachInfluencer.js',
  'CoachingSystem.js': 'systems/coaches/CoachingSystem.js',
  'CoachPartnershipSystem.js': 'systems/coaches/CoachPartnershipSystem.js',
  'CoachProfiles.js': 'systems/coaches/CoachProfiles.js',
  'CoachTacticTracker.js': 'systems/coaches/CoachTacticTracker.js',
  'constants.js': 'core/constants.js',
  'ContactModel.js': 'systems/contact/ContactModel.js',
  'contactSpace.js': 'systems/contact/contactSpace.js',
  'CONTATO_CONFIG.js': 'config/CONTATO_CONFIG.js',
  'coreShotPipeline.js': 'systems/shots/coreShotPipeline.js',
  'courtConfigs.js': 'domain/courts/courtConfigs.js',
  'courtImages.js': 'domain/courts/courtImages.js',
  'DECISAO_CONFIG.js': 'config/DECISAO_CONFIG.js',
  'DevelopmentConstants.js': 'systems/progression/DevelopmentConstants.js',
  'DevelopmentSystem.js': 'systems/progression/DevelopmentSystem.js',
  'EnvironmentSystem.js': 'systems/environment/EnvironmentSystem.js',
  'executionState.js': 'core/executionState.js',
  'FastSimulation.js': 'core/FastSimulation.js',
  'feasibilityMatrix.js': 'systems/contact/feasibilityMatrix.js',
  'FinanceSystem.js': 'systems/finance/FinanceSystem.js',
  'FISICA_CONFIG.js': 'config/FISICA_CONFIG.js',
  'formas.jsx': 'systems/progression/formas.jsx',
  'HallOfFame.js': 'systems/history/HallOfFame.js',
  'HallOfFameView.jsx': 'ui/history/HallOfFameView.jsx',
  'Headless.jsx': 'core/Headless.jsx',
  'IndividualRating.jsx': 'ui/game/IndividualRating.jsx',
  'InjurySystem.js': 'systems/health/InjurySystem.js',
  'InterviewEngine.js': 'systems/press/InterviewEngine.js',
  'LifeEventSystem.js': 'systems/life/LifeEventSystem.js',
  'liveMatchAudit.js': 'systems/audit/liveMatchAudit.js',
  'MatchHeat.js': 'systems/analytics/MatchHeat.js',
  'MatchNarrator.js': 'systems/press/MatchNarrator.js',
  'MatchPlanSystem.js': 'systems/match/MatchPlanSystem.js',
  'math.js': 'core/math.js',
  'MovementMaster.js': 'systems/movement/MovementMaster.js',
  'NewgenImagePool.js': 'systems/newgen/NewgenImagePool.js',
  'NewgenSystem.js': 'systems/newgen/NewgenSystem.js',
  'NEWME1.0.jsx': 'ui/game/NEWME1.0.jsx',
  'NewsEngine.js': 'systems/press/NewsEngine.js',
  'OOutroMundo.js': 'systems/progression/OOutroMundo.js',
  'PhaseTwo.js': 'systems/shots/PhaseTwo.js',
  'physics.js': 'core/physics.js',
  'PlayerLifeData.js': 'domain/players/PlayerLifeData.js',
  'PlayerPersonality.js': 'domain/players/PlayerPersonality.js',
  'playerPrefs.js': 'domain/players/playerPrefs.js',
  'players.js': 'domain/players/players.js',
  'PlayerTraits.js': 'domain/players/PlayerTraits.js',
  'pointPatterns.js': 'systems/shots/pointPatterns.js',
  'RankingSystem.js': 'systems/ranking/RankingSystem.js',
  'RetirementSystem.js': 'systems/career/RetirementSystem.js',
  'RivalrySystem.js': 'systems/circuit/RivalrySystem.js',
  'ScoutProfile.js': 'systems/scouting/ScoutProfile.js',
  'shotDecision.js': 'systems/shots/shotDecision.js',
  'shotDecisionEngine.js': 'systems/shots/shotDecisionEngine.js',
  'shotDecisionTrace.js': 'systems/shots/shotDecisionTrace.js',
  'shotIntentSystem.js': 'systems/shots/shotIntentSystem.js',
  'shotPhysics.js': 'systems/shots/shotPhysics.js',
  'shotPoolAdjusters.js': 'systems/shots/shotPoolAdjusters.js',
  'shotPoolsConfig.js': 'systems/shots/shotPoolsConfig.js',
  'SHOTS_CONFIG.js': 'config/SHOTS_CONFIG.js',
  'shotTemperatureModel.js': 'systems/shots/shotTemperatureModel.js',
  'SignaturePatterns.js': 'systems/shots/SignaturePatterns.js',
  'SignatureShots.js': 'systems/shots/SignatureShots.js',
  'simulationTelemetry.js': 'systems/analytics/simulationTelemetry.js',
  'sound.js': 'systems/audio/sound.js',
  'SponsorContractSystem.js': 'systems/sponsors/SponsorContractSystem.js',
  'SponsorPool.js': 'systems/sponsors/SponsorPool.js',
  'SponsorProfiles.js': 'systems/sponsors/SponsorProfiles.js',
  'styles.js': 'domain/players/styles.js',
  'swingPrepEngine.js': 'systems/contact/swingPrepEngine.js',
  'TournamentPreferences.js': 'systems/tournaments/TournamentPreferences.js',
  'TournamentSystem.js': 'systems/tournaments/TournamentSystem.js',
  'trace.js': 'core/trace.js',
  'TraitSystem.js': 'systems/traits/TraitSystem.js',
  'uiTheme.js': 'ui/theme/uiTheme.js',
  'unifiedLog.js': 'core/unifiedLog.js',
  'vfx.js': 'systems/vfx/vfx.js',
  'wingIdentity.js': 'systems/shots/wingIdentity.js',
  'components/App.jsx': 'ui/App.jsx',
  'components/BounceMap.jsx': 'ui/analytics/BounceMap.jsx',
  'components/BroadcastUniverse.jsx': 'ui/universe/BroadcastUniverse.jsx',
  'components/CarreiraTimeline.jsx': 'ui/career/CarreiraTimeline.jsx',
  'components/CoachProfileView.jsx': 'ui/coaches/CoachProfileView.jsx',
  'components/ContactMap.jsx': 'ui/analytics/ContactMap.jsx',
  'components/DebugLog.jsx': 'ui/game/DebugLog.jsx',
  'components/HeadlessOverlay.jsx': 'ui/game/HeadlessOverlay.jsx',
  'components/HomeScreen.jsx': 'ui/game/HomeScreen.jsx',
  'components/InterviewView.jsx': 'ui/press/InterviewView.jsx',
  'components/JornalView.jsx': 'ui/press/JornalView.jsx',
  'components/LandingMap.jsx': 'ui/analytics/LandingMap.jsx',
  'components/MatchOverScreen.jsx': 'ui/game/MatchOverScreen.jsx',
  'components/PatternMap.jsx': 'ui/analytics/PatternMap.jsx',
  'components/PositionHeatmap.jsx': 'ui/analytics/PositionHeatmap.jsx',
  'components/PressCenter.jsx': 'ui/press/PressCenter.jsx',
  'components/ShotDirectionMap.jsx': 'ui/analytics/ShotDirectionMap.jsx',
  'components/SimulatorScreen.jsx': 'ui/game/SimulatorScreen.jsx',
  'components/SoundSettings.jsx': 'ui/game/SoundSettings.jsx',
  'components/TecnicosView.jsx': 'ui/coaches/TecnicosView.jsx',
  'components/TournamentBracket.jsx': 'ui/tournaments/TournamentBracket.jsx',
  'components/TracePanel.jsx': 'ui/game/TracePanel.jsx',
  'components/UnifiedPlayerProfile2.jsx': 'ui/players/UnifiedPlayerProfile2.jsx',
  'components/UniverseManager.jsx': 'ui/universe/UniverseManager.jsx',
  'pixel/appearances.js': 'ui/pixel/appearances.js',
  'pixel/CourtRenderer.js': 'ui/pixel/CourtRenderer.js',
};

const aliasMap = new Map();
for (const [from, to] of Object.entries(moveMap)) {
  aliasMap.set(normalizeRel(from), normalizeRel(to));
  aliasMap.set(normalizeRel(`./${from}`), normalizeRel(to));
}

function normalizeRel(relPath) {
  return relPath.replace(/\\/g, '/').replace(/^src\//, '').replace(/^\.\//, '');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function moveFile(sourceAbs, targetAbs) {
  ensureDir(targetAbs);
  fs.copyFileSync(sourceAbs, targetAbs);
  fs.unlinkSync(sourceAbs);
}

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function resolveImportTarget(importerRel, spec) {
  const importerDir = path.posix.dirname(importerRel);
  const resolved = path.posix.normalize(path.posix.join(importerDir, spec));
  return normalizeRel(resolved);
}

function toPosixPath(p) {
  return p.split(path.sep).join('/');
}

function rewriteImports(fileAbs) {
  const ext = path.extname(fileAbs);
  if (!['.js', '.jsx', '.css'].includes(ext)) return;

  const content = fs.readFileSync(fileAbs, 'utf8');
  const fileRel = normalizeRel(path.relative(srcRoot, fileAbs));
  const fileDir = path.posix.dirname(fileRel);

  const updated = content.replace(
    /((?:import|export)\s[\s\S]*?\sfrom\s*|import\s*)(['"])(\.[^'"]+)(['"])/g,
    (match, prefix, q1, spec, q2) => {
      const targetRel = resolveImportTarget(fileRel, spec);
      const movedTarget = aliasMap.get(targetRel) ?? targetRel;
      const nextRel = path.posix.relative(fileDir, movedTarget);
      const normalized = nextRel.startsWith('.') ? nextRel : `./${nextRel}`;
      return `${prefix}${q1}${normalized}${q2}`;
    },
  );

  if (updated !== content) {
    fs.writeFileSync(fileAbs, updated, 'utf8');
  }
}

function buildBasenameIndex() {
  const index = new Map();
  for (const file of listFiles(srcRoot)) {
    const rel = normalizeRel(path.relative(srcRoot, file));
    const base = path.posix.basename(rel);
    if (!index.has(base)) index.set(base, []);
    index.get(base).push(rel);
  }
  return index;
}

function repairBrokenRelativeImports(fileAbs, basenameIndex) {
  const ext = path.extname(fileAbs);
  if (!['.js', '.jsx'].includes(ext)) return;

  const content = fs.readFileSync(fileAbs, 'utf8');
  const fileRel = normalizeRel(path.relative(srcRoot, fileAbs));
  const fileDir = path.posix.dirname(fileRel);

  const updated = content.replace(
    /((?:import|export)\s[\s\S]*?\sfrom\s*|import\s*)(['"])(\.[^'"]+)(['"])/g,
    (match, prefix, q1, spec, q2) => {
      const targetRel = resolveImportTarget(fileRel, spec);
      const targetAbs = path.join(srcRoot, ...targetRel.split('/'));
      if (fs.existsSync(targetAbs) || fs.existsSync(`${targetAbs}.js`) || fs.existsSync(`${targetAbs}.jsx`)) {
        return match;
      }

      const base = path.posix.basename(spec);
      const candidates = basenameIndex.get(base) ?? [];
      if (candidates.length !== 1) return match;

      const nextRel = path.posix.relative(fileDir, candidates[0]);
      const normalized = nextRel.startsWith('.') ? nextRel : `./${nextRel}`;
      return `${prefix}${q1}${normalized}${q2}`;
    },
  );

  if (updated !== content) {
    fs.writeFileSync(fileAbs, updated, 'utf8');
  }
}

for (const [from, to] of Object.entries(moveMap)) {
  const sourceAbs = path.join(srcRoot, ...from.split('/'));
  const targetAbs = path.join(srcRoot, ...to.split('/'));
  if (!fs.existsSync(sourceAbs)) continue;
  moveFile(sourceAbs, targetAbs);
}

for (const file of listFiles(srcRoot)) {
  rewriteImports(file);
}

const basenameIndex = buildBasenameIndex();
for (const file of listFiles(srcRoot)) {
  repairBrokenRelativeImports(file, basenameIndex);
}

const cleanupDirs = [
  path.join(srcRoot, 'components'),
  path.join(srcRoot, 'pixel'),
];

for (const dir of cleanupDirs) {
  if (!fs.existsSync(dir)) continue;
  if (fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
}

console.log('src reorganizada com sucesso');
