import { evaluateContact } from '../contact/ContactModel.js';
import { computeContactSpace } from '../contact/contactSpace.js';
import { deriveExecutionState } from '../../core/executionState.js';
import { buildFeasibilityMatrix } from '../contact/feasibilityMatrix.js';
import { computeSwingPrep } from '../contact/swingPrepEngine.js';

function buildPrepScore(player) {
  const prepFrac1 = player._prepFrac1 ?? 0;
  const prepFrac2 = player._prepFrac2 ?? 0;
  return prepFrac1 * 0.65 + prepFrac2 * 0.35;
}

export function buildCoreShotPipeline(player, ball) {
  const contactSpace = computeContactSpace(ball, player);
  const swingPrep = computeSwingPrep(contactSpace, player, ball);
  const feasibility = buildFeasibilityMatrix(
    contactSpace.heightZone,
    contactSpace.offsetZone,
    swingPrep.swingType,
  );

  const prepScore = buildPrepScore(player);
  const contactCeiling = Math.min(
    swingPrep.prepQuality ?? 1,
    contactSpace.qCeiling ?? 1,
  );
  const contactResult = evaluateContact(
    player.ctx,
    player,
    ball,
    player._arrivalMargin ?? 0,
    Math.abs(player.vel?.x ?? 0),
    contactSpace.distFromOptimal ?? 0,
    prepScore,
    contactCeiling,
  );

  const executionState = deriveExecutionState(contactSpace, swingPrep, contactResult, player, ball);

  return {
    prepScore,
    contactSpace,
    swingPrep,
    feasibility,
    contactResult,
    executionState,
  };
}

export function assignCoreShotPipeline(player, pipeline) {
  player._coreShotPipeline = pipeline;
  player._contactSpace = pipeline.contactSpace;
  player._swingPrep = pipeline.swingPrep;
  player._feasibility = pipeline.feasibility;
  player._contactResult = pipeline.contactResult;
  player._executionState = pipeline.executionState;
  player._prepScore = pipeline.prepScore;
}
