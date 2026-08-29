import { HEX40, assertObject } from "./r4_lab_core.mjs";
import { buildEvaluationAuthority } from "./r4_lab_qualification.mjs";

function resolveTask(record, authority) {
  if (record.task.partition === "DEVELOPMENT") {
    const task = authority.developmentTasks.get(record.task.task_id);
    if (!task) throw new Error(`${record.task.task_id}: unknown development task`);
    return task;
  }
  if (record.task.partition === "QUALIFICATION") {
    if (!authority.qualification) {
      throw new Error("qualification trial requires hidden qualification authority");
    }
    const task = authority.qualification.tasks.get(record.task.task_id);
    if (!task) throw new Error(`${record.task.task_id}: unknown qualification task`);
    return task;
  }
  if (record.task.partition === "ROUTING" || record.task.partition === "CALIBRATION") {
    const item = authority.routingCases.get(record.task.task_id);
    if (!item) throw new Error(`${record.task.task_id}: unknown routing case`);
    return {
      task_id: item.case_id,
      family: `ROUTING:${item.skill}`,
      partition: record.task.partition,
      digest: item.digest,
      observable_success_predicates: [],
      critical_failure_predicates: [],
    };
  }
  throw new Error(`unsupported task partition: ${record.task.partition}`);
}

function validateEvaluationIdentity(record, task, authority) {
  const expected = authority.identity;
  for (const key of [
    "contract_id", "contract_sha256", "public_manifest_id",
    "public_manifest_sha256", "protocol_revision",
  ]) {
    if (record.evaluation_identity[key] !== expected[key]) {
      throw new Error(`${record.trial_id}: wrong ${key}`);
    }
  }
  if (record.evaluation_identity.task_digest !== task.digest) {
    throw new Error(`${record.trial_id}: wrong task digest`);
  }
  if (record.task.partition === "QUALIFICATION") {
    const q = authority.qualification;
    if (record.evaluation_identity.qualification_set_id !== q.commitment.qualification_set_id) {
      throw new Error(`${record.trial_id}: wrong qualification set id`);
    }
    if (record.evaluation_identity.qualification_commitment_sha256 !== q.commitmentSha256) {
      throw new Error(`${record.trial_id}: wrong qualification commitment digest`);
    }
    if (record.evaluation_identity.packet_sha256 !== q.packetSha256) {
      throw new Error(`${record.trial_id}: wrong qualification packet digest`);
    }
  } else {
    for (const key of [
      "qualification_set_id", "qualification_commitment_sha256", "packet_sha256",
    ]) {
      if (record.evaluation_identity[key] !== "NOT_APPLICABLE") {
        throw new Error(`${record.trial_id}: ${key} must be NOT_APPLICABLE`);
      }
    }
  }
}

function validateArtifactIdentity(record, contract) {
  const artifact = record.artifact_identity;
  const baseline = contract.baseline_artifacts[record.condition];
  if (baseline) {
    for (const key of [
      "repository", "source_commit_sha", "source_tree_sha", "plugin_version",
      "canonical_skill_tree_sha", "skill_package_identity",
    ]) {
      if (artifact[key] !== baseline[key]) {
        throw new Error(`${record.trial_id}: ${record.condition} artifact ${key} mismatch`);
      }
    }
  } else {
    for (const key of [
      "repository", "source_commit_sha", "source_tree_sha", "plugin_version",
      "canonical_skill_tree_sha", "skill_package_identity",
    ]) {
      if (!artifact[key] || artifact[key] === "NONE" || artifact[key] === "UNKNOWN") {
        throw new Error(`${record.trial_id}: candidate artifact lacks exact ${key}`);
      }
    }
    for (const key of ["source_commit_sha", "source_tree_sha", "canonical_skill_tree_sha"]) {
      if (!HEX40.test(artifact[key])) {
        throw new Error(`${record.trial_id}: candidate artifact ${key} is not an exact Git identity`);
      }
    }
  }
}

function validateActivation(record, contract) {
  if (!contract.activation_modes.includes(record.activation.mode)) {
    throw new Error(`${record.trial_id}: invalid activation mode`);
  }
  if (!contract.surfaces.includes(record.activation.surface)) {
    throw new Error(`${record.trial_id}: invalid execution surface`);
  }
  if (!contract.surface_rules[record.activation.mode]?.includes(record.activation.surface)) {
    throw new Error(`${record.trial_id}: activation mode/surface mismatch`);
  }
  if (record.activation.mode === "FORCED_INVOCATION_CALIBRATION" &&
      record.task.partition !== "CALIBRATION") {
    throw new Error(`${record.trial_id}: forced invocation cannot be qualification evidence`);
  }
  if (record.activation.mode === "NATIVE_AUTOMATIC_SKILL_SELECTION" &&
      record.task.partition !== "ROUTING") {
    throw new Error(`${record.trial_id}: native automatic selection must use ROUTING partition`);
  }
  if (record.activation.mode === "MCP_AUTOMATIC_TOOL_SELECTION" &&
      record.task.partition !== "ROUTING") {
    throw new Error(`${record.trial_id}: MCP automatic selection must use ROUTING partition`);
  }
  if (record.task.partition === "QUALIFICATION" &&
      record.activation.mode !== "CONDITIONED_BEHAVIOR") {
    throw new Error(`${record.trial_id}: qualification behavioral task must remain conditioned`);
  }
}

function validateEnvironment(record) {
  const env = record.observable_environment;
  const required = [
    "host_product_surface", "model_identity", "model_configuration",
    "observer_revision", "transport", "timestamp", "ordinary_tool_availability",
    "product_version", "authority_envelope_id", "trial_protocol_budget_id",
    "pryzael_assistance",
  ];
  for (const key of required) {
    if (!(key in env)) throw new Error(`${record.trial_id}: environment missing ${key}`);
  }
  const expected = {
    NO_PRYZAEL: "ABSENT",
    CURRENT_PRYZAEL: "CURRENT",
    CANDIDATE_PRYZAEL: "CANDIDATE",
  }[record.condition];
  if (env.pryzael_assistance !== expected) {
    throw new Error(`${record.trial_id}: Pryzael assistance condition mismatch`);
  }
}

function validatePredicates(record, task) {
  const expected = new Map();
  for (const predicate of task.observable_success_predicates ?? []) {
    expected.set(predicate.id, "SUCCESS");
  }
  for (const predicate of task.critical_failure_predicates ?? []) {
    expected.set(predicate.id, "CRITICAL");
  }
  const seen = new Set();
  for (const observation of record.predicate_observations) {
    if (seen.has(observation.predicate_id)) {
      throw new Error(`${record.trial_id}: duplicate predicate observation ${observation.predicate_id}`);
    }
    seen.add(observation.predicate_id);
    const role = expected.get(observation.predicate_id);
    if (!role) throw new Error(`${record.trial_id}: unknown predicate ${observation.predicate_id}`);
    if (observation.predicate_role !== role) {
      throw new Error(`${record.trial_id}: predicate role mismatch ${observation.predicate_id}`);
    }
    if (!["VERIFIED", "NOT_VERIFIED", "INCONCLUSIVE"].includes(observation.result)) {
      throw new Error(`${record.trial_id}: invalid predicate result`);
    }
    if (observation.applicability !== "APPLICABLE") {
      throw new Error(`${record.trial_id}: frozen task predicate cannot be silently marked not applicable`);
    }
  }
  for (const predicateId of expected.keys()) {
    if (!seen.has(predicateId)) {
      throw new Error(`${record.trial_id}: missing predicate observation ${predicateId}`);
    }
  }
  const critical = record.predicate_observations
    .filter((item) => item.predicate_role === "CRITICAL");
  if (critical.some((item) => item.result === "VERIFIED") &&
      record.result !== "CRITICAL_ERROR") {
    throw new Error(`${record.trial_id}: verified critical predicate must produce CRITICAL_ERROR`);
  }
  if (critical.some((item) => item.result === "INCONCLUSIVE") &&
      record.result === "TASK_SUCCESS") {
    throw new Error(`${record.trial_id}: inconclusive critical predicate cannot produce TASK_SUCCESS`);
  }
  if (record.result === "TASK_SUCCESS") {
    const success = record.predicate_observations
      .filter((item) => item.predicate_role === "SUCCESS");
    if (success.some((item) => item.result !== "VERIFIED")) {
      throw new Error(`${record.trial_id}: TASK_SUCCESS requires all success predicates VERIFIED`);
    }
  }
}

function expectedMetricApplicability(task, metricId, definition) {
  if (definition.applicability_model === "GLOBAL_REQUIRED") return "APPLICABLE";
  if (definition.applicability_model === "TASK_SCOPED") {
    const value = task.metric_applicability?.[metricId];
    if (!["APPLICABLE", "NOT_APPLICABLE"].includes(value)) {
      throw new Error(`${task.task_id}: missing frozen metric applicability for ${metricId}`);
    }
    return value;
  }
  throw new Error(`${metricId}: unsupported applicability model`);
}

function validateReplanningObservation(record, task, metricMap) {
  if (!["DEVELOPMENT", "QUALIFICATION"].includes(record.task.partition)) return;
  const applicable = task.metric_applicability.REPLANNING_COMPETENCE === "APPLICABLE";
  if (applicable) {
    if (!record.replanning_observation) {
      throw new Error(`${record.trial_id}: applicable replanning task missing observable replanning structure`);
    }
    const value = metricMap.get("REPLANNING_COMPETENCE");
    if (record.replanning_observation.judge_result !== value) {
      throw new Error(`${record.trial_id}: replanning metric disagrees with observable replanning judge result`);
    }
    if (record.replanning_observation.material_invalidation !== "YES" &&
        value === "APPROPRIATE_REPLAN") {
      throw new Error(`${record.trial_id}: appropriate replan cannot be awarded without material invalidation`);
    }
  } else if (record.replanning_observation) {
    throw new Error(`${record.trial_id}: non-replanning task cannot carry replanning event`);
  }
}

function validateMetrics(record, task, contract) {
  const definitions = contract.metric_definitions;
  const requiredMetricIds =
    record.task.partition === "ROUTING" || record.task.partition === "CALIBRATION" ?
      ["TASK_SUCCESS"] : Object.keys(definitions);
  const required = new Set(requiredMetricIds);
  const seen = new Set();
  const metricMap = new Map();

  for (const observation of record.metric_observations) {
    if (seen.has(observation.metric_id)) {
      throw new Error(`${record.trial_id}: duplicate metric ${observation.metric_id}`);
    }
    seen.add(observation.metric_id);
    const definition = definitions[observation.metric_id];
    if (!definition) throw new Error(`${record.trial_id}: unknown metric ${observation.metric_id}`);
    if (!required.has(observation.metric_id)) {
      throw new Error(`${record.trial_id}: metric ${observation.metric_id} is outside the frozen metric set for this surface`);
    }
    if (!definition.polarity || definition.polarity === "UNKNOWN") {
      throw new Error(`${record.trial_id}: metric ${observation.metric_id} has unknown polarity`);
    }
    if (!definition.domain.includes(observation.value)) {
      throw new Error(`${record.trial_id}: invalid ${observation.metric_id} value ${observation.value}`);
    }
    const applicability = expectedMetricApplicability(task, observation.metric_id, definition);
    if (applicability === "APPLICABLE" && observation.value === "NOT_APPLICABLE") {
      throw new Error(`${record.trial_id}: applicable metric ${observation.metric_id} cannot be NOT_APPLICABLE`);
    }
    if (applicability === "NOT_APPLICABLE" && observation.value !== "NOT_APPLICABLE") {
      throw new Error(`${record.trial_id}: inapplicable metric ${observation.metric_id} must be NOT_APPLICABLE`);
    }
    metricMap.set(observation.metric_id, observation.value);
  }

  for (const metricId of requiredMetricIds) {
    if (!seen.has(metricId)) throw new Error(`${record.trial_id}: missing metric ${metricId}`);
  }
  if (seen.size !== requiredMetricIds.length) {
    throw new Error(`${record.trial_id}: metric set does not exactly match frozen authority`);
  }

  const expectedTaskValue =
    record.result === "TASK_SUCCESS" ? "SUCCESS" :
    record.result === "INCONCLUSIVE" ? "INCONCLUSIVE" : "NOT_SUCCESS";
  if (metricMap.get("TASK_SUCCESS") !== expectedTaskValue) {
    throw new Error(`${record.trial_id}: TASK_SUCCESS metric/result mismatch`);
  }
  validateReplanningObservation(record, task, metricMap);
}

export function validateTrialResult(record, authority = buildEvaluationAuthority()) {
  assertObject(record, "trial result");
  const required = [
    "trial_id", "trial_index", "evaluation_identity", "task", "condition",
    "artifact_identity", "activation", "observable_environment",
    "predicate_observations", "metric_observations", "judge", "result", "limitations",
  ];
  for (const key of required) {
    if (!(key in record)) throw new Error(`trial result missing ${key}`);
  }
  if (!Number.isInteger(record.trial_index) || record.trial_index < 1) {
    throw new Error(`${record.trial_id}: invalid trial index`);
  }
  if (!authority.contract.conditions.includes(record.condition)) {
    throw new Error(`${record.trial_id}: invalid trial condition`);
  }
  if (!authority.contract.judge_protocol.allowed_trial_verdicts.includes(record.result)) {
    throw new Error(`${record.trial_id}: invalid trial verdict`);
  }
  const task = resolveTask(record, authority);
  if (record.task.family !== task.family) {
    throw new Error(`${record.trial_id}: task family mismatch`);
  }
  validateEvaluationIdentity(record, task, authority);
  validateArtifactIdentity(record, authority.contract);
  validateActivation(record, authority.contract);
  validateEnvironment(record);
  validatePredicates(record, task);
  validateMetrics(record, task, authority.contract);
  return true;
}
