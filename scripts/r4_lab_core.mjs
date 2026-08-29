import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const EVAL = path.join(ROOT, "evaluation");
export const HEX64 = /^[0-9a-f]{64}$/;
export const HEX40 = /^[0-9a-f]{40}$/;
export const FORBIDDEN_PROMPT_TEXT = /\b(PRYZAEL|CANDIDATE_PRYZAEL|CURRENT_PRYZAEL|NO_PRYZAEL|HARD INVARIANT|HEURISTIC|OPTIONAL TECHNIQUE)\b/i;
export const SECRET_COMMITMENT_KEYS = new Set([
  "prompt", "observable_success_predicates", "critical_failure_predicates",
  "judge_reference_material", "gold", "answer", "expected_answer", "metric_applicability",
]);

const APPLICABILITY_MODELS = new Set(["GLOBAL_REQUIRED", "TASK_SCOPED"]);
const APPLICABILITY_VALUES = new Set(["APPLICABLE", "NOT_APPLICABLE"]);
const METRIC_ROLES = new Set(["AUTHORITATIVE", "CRITICAL", "DIAGNOSTIC"]);
const ADMISSION_POLICY_KINDS = new Set([
  "TASK_SUCCESS_NON_INFERIORITY",
  "NON_INFERIOR_TO_BASELINE",
  "CRITICAL_NON_INFERIOR_TO_BASELINE",
  "MAX_ALLOWED_REGRESSION",
  "DIAGNOSTIC_ONLY",
]);

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
export function gitBlobSha1(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return crypto.createHash("sha1").update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex");
}
export function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b, "en"))
      .map(([key, item]) => [key, sortDeep(item)]),
  );
}
function canonicalBytes(value, omitted = []) {
  const copy = structuredClone(value);
  for (const key of omitted) delete copy[key];
  return Buffer.from(JSON.stringify(sortDeep(copy)));
}
export function taskDigest(task) {
  return sha256(canonicalBytes(task, ["digest"]));
}
export function routingCaseDigest(item) {
  return sha256(canonicalBytes(item));
}
export function readBytes(relative) {
  return fs.readFileSync(path.join(ROOT, relative));
}
export function readJson(relative) {
  return JSON.parse(readBytes(relative).toString("utf8"));
}
export function publicProtocolIdentity(contract) {
  return `${contract.protocol_revision.id}@${contract.protocol_revision.protocol_blob_sha}`;
}
function isUnknown(value) {
  return value === "UNKNOWN";
}
export function sameObservedValue(a, b) {
  if (isUnknown(a) || isUnknown(b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}
export function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: expected object`);
  }
}
export function assertExactKeys(value, required, allowed, label) {
  assertObject(value, label);
  for (const key of required) {
    if (!(key in value)) throw new Error(`${label}: missing ${key}`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${label}: unknown field ${key}`);
  }
}

export function taskScopedMetricIds(contract) {
  return Object.entries(contract.metric_definitions ?? {})
    .filter(([, metric]) => metric.applicability_model === "TASK_SCOPED")
    .map(([metricId]) => metricId);
}

function validatePredicateSet(task, role, predicates) {
  if (role === "SUCCESS" && (!Array.isArray(predicates) || predicates.length === 0)) {
    throw new Error(`${task.task_id}: missing observable success predicates`);
  }
  const ids = new Set();
  for (const predicate of predicates ?? []) {
    if (!predicate.id || ids.has(predicate.id)) {
      throw new Error(`${task.task_id}: duplicate/missing predicate id`);
    }
    ids.add(predicate.id);
    if (!["OBJECTIVE", "SUBJECTIVE"].includes(predicate.kind)) {
      throw new Error(`${task.task_id}:${predicate.id}: invalid predicate kind`);
    }
    if (!predicate.statement || FORBIDDEN_PROMPT_TEXT.test(predicate.statement)) {
      throw new Error(`${task.task_id}:${predicate.id}: predicate is condition/protocol-coupled`);
    }
  }
  return ids;
}

export function validateTaskMetricApplicability(task, contract) {
  const scoped = taskScopedMetricIds(contract);
  assertObject(task.metric_applicability, `${task.task_id}: metric_applicability`);
  const actual = Object.keys(task.metric_applicability).sort((a, b) => a.localeCompare(b, "en"));
  const expected = [...scoped].sort((a, b) => a.localeCompare(b, "en"));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const missing = expected.filter((id) => !actual.includes(id));
    const extra = actual.filter((id) => !expected.includes(id));
    throw new Error(`${task.task_id}: metric applicability authority mismatch; missing=${missing.join(",") || "NONE"} extra=${extra.join(",") || "NONE"}`);
  }
  for (const metricId of expected) {
    const value = task.metric_applicability[metricId];
    if (!APPLICABILITY_VALUES.has(value)) {
      throw new Error(`${task.task_id}: invalid applicability for ${metricId}`);
    }
  }
  const replanApplicable = task.metric_applicability.REPLANNING_COMPETENCE === "APPLICABLE";
  if (replanApplicable) {
    if (!task.replanning_event?.prior_plan_or_assumption ||
        !task.replanning_event?.new_evidence ||
        task.replanning_event?.material_invalidation_required !== true) {
      throw new Error(`${task.task_id}: applicable replanning metric lacks frozen observable event structure`);
    }
  } else if (task.replanning_event) {
    throw new Error(`${task.task_id}: replanning event exists while REPLANNING_COMPETENCE is NOT_APPLICABLE`);
  }
  if (task.family === "LEGITIMATE_REPLANNING" && !replanApplicable) {
    throw new Error(`${task.task_id}: LEGITIMATE_REPLANNING must make REPLANNING_COMPETENCE applicable`);
  }
  return true;
}

function validateDevelopmentTask(task, seen, contract) {
  const required = [
    "task_id", "partition", "family", "risk", "prompt",
    "observable_success_predicates", "critical_failure_predicates",
    "metric_applicability", "digest",
  ];
  const allowed = [...required, "replanning_event"];
  assertExactKeys(task, required, allowed, task.task_id ?? "development task");
  if (task.partition !== "DEVELOPMENT") throw new Error(`${task.task_id}: development partition mismatch`);
  if (!/^DEV-[A-Z0-9-]+$/.test(task.task_id)) throw new Error(`${task.task_id}: invalid development task id`);
  if (seen.has(task.task_id)) throw new Error(`${task.task_id}: duplicate task id`);
  seen.add(task.task_id);
  if (typeof task.prompt !== "string" || task.prompt.trim().length < 40) {
    throw new Error(`${task.task_id}: prompt is incomplete`);
  }
  if (FORBIDDEN_PROMPT_TEXT.test(task.prompt)) {
    throw new Error(`${task.task_id}: prompt leaks condition/protocol vocabulary`);
  }
  const successIds = validatePredicateSet(task, "SUCCESS", task.observable_success_predicates);
  const criticalIds = validatePredicateSet(task, "CRITICAL", task.critical_failure_predicates ?? []);
  for (const id of criticalIds) {
    if (successIds.has(id)) throw new Error(`${task.task_id}: predicate id reused across roles: ${id}`);
  }
  validateTaskMetricApplicability(task, contract);
  if (task.digest !== taskDigest(task)) throw new Error(`${task.task_id}: frozen task digest mismatch`);
}

export function validateDevelopmentCorpus(corpus, contract = readJson("evaluation/contract.json")) {
  if (corpus.schema_version !== "r4-corpus-v1" || corpus.partition !== "DEVELOPMENT") {
    throw new Error("development corpus authority mismatch");
  }
  if (!Array.isArray(corpus.tasks) || corpus.tasks.length !== 7) {
    throw new Error("development corpus expected exactly 7 preserved tasks");
  }
  const seen = new Set();
  for (const task of corpus.tasks) validateDevelopmentTask(task, seen, contract);
  return new Map(corpus.tasks.map((task) => [task.task_id, task]));
}

export function expandRoutingCases(routing) {
  if (routing.schema_version !== "r4-routing-v2") throw new Error("unsupported routing schema");
  const requiredTypes = [
    "CLEAR_POSITIVE", "CLEAR_NEGATIVE", "NEAR_NEIGHBOR", "AMBIGUOUS",
    "COMPOUND", "ADVERSARIAL", "FRESH_CHAT_AUTOMATIC", "FORCED_INVOCATION_CALIBRATION",
  ];
  if (JSON.stringify(routing.case_types) !== JSON.stringify(requiredTypes)) {
    throw new Error("routing case type contract drift");
  }
  const skillNames = Object.keys(routing.skills ?? {}).sort((a, b) => a.localeCompare(b, "en"));
  if (skillNames.length !== 10) {
    throw new Error(`routing matrix expected 10 canonical Skills, found ${skillNames.length}`);
  }
  const cases = [];
  for (const skill of skillNames) {
    const prompts = routing.skills[skill];
    if (!prompts?.positive || !prompts?.negative || !prompts?.near_neighbor) {
      throw new Error(`${skill}: incomplete routing prompt family`);
    }
    for (const caseType of requiredTypes) {
      let prompt;
      if (caseType === "CLEAR_POSITIVE" || caseType === "FRESH_CHAT_AUTOMATIC") prompt = prompts.positive;
      else if (caseType === "CLEAR_NEGATIVE") prompt = prompts.negative;
      else if (caseType === "NEAR_NEIGHBOR") prompt = prompts.near_neighbor;
      else if (caseType === "AMBIGUOUS") prompt = routing.shared_prompts?.ambiguous;
      else if (caseType === "COMPOUND") prompt = routing.shared_prompts?.compound;
      else if (caseType === "ADVERSARIAL") prompt = `${routing.shared_prompts?.adversarial_prefix ?? ""}${prompts.positive}`;
      else prompt = `${(routing.shared_prompts?.forced_prefix ?? "").replace("{skill}", skill)}${prompts.positive}`;
      if (!prompt) throw new Error(`${skill}:${caseType}: missing resolved routing prompt`);
      const expected = caseType === "CLEAR_NEGATIVE" ? `NOT:${skill}` :
        caseType === "AMBIGUOUS" ? "INCONCLUSIVE_ALLOWED" :
        caseType === "COMPOUND" ? "MULTI_SKILL_ALLOWED" : skill;
      const admissionSurface = caseType === "FRESH_CHAT_AUTOMATIC" ?
        "NATIVE_AUTOMATIC_SKILL_SELECTION" :
        caseType === "FORCED_INVOCATION_CALIBRATION" ? "CALIBRATION_ONLY" : "ROUTING_DIAGNOSTIC";
      const item = {
        case_id: `ROUTE-${skill.toUpperCase().replaceAll("-", "_")}-${caseType}`,
        skill, case_type: caseType, prompt, expected, admission_surface: admissionSurface,
      };
      cases.push({...item, digest: routingCaseDigest(item)});
    }
  }
  const withoutDigests = cases.map(({digest, ...item}) => item);
  const matrixDigest = sha256(Buffer.from(JSON.stringify(sortDeep(withoutDigests))));
  if (routing.matrix_digest !== matrixDigest) throw new Error("frozen routing matrix digest mismatch");
  return cases;
}

function validateAdmissionPolicy(metricId, metric) {
  const policy = metric.admission_policy;
  assertObject(policy, `${metricId}: admission_policy`);
  if (!ADMISSION_POLICY_KINDS.has(policy.kind)) {
    throw new Error(`${metricId}: unknown admission policy ${policy.kind}`);
  }
  if (metric.admission_role === "DIAGNOSTIC") {
    if (policy.kind !== "DIAGNOSTIC_ONLY") {
      throw new Error(`${metricId}: diagnostic metric must use DIAGNOSTIC_ONLY`);
    }
    return;
  }
  if (policy.kind === "DIAGNOSTIC_ONLY") {
    throw new Error(`${metricId}: authoritative/critical metric cannot use diagnostic-only policy`);
  }
  if (policy.kind === "TASK_SUCCESS_NON_INFERIORITY") {
    if (metricId !== "TASK_SUCCESS" ||
        typeof policy.total_delta_floor !== "number" ||
        typeof policy.family_delta_floor !== "number") {
      throw new Error(`${metricId}: malformed task-success admission policy`);
    }
    return;
  }
  if (!Array.isArray(policy.failure_values) || policy.failure_values.length === 0) {
    throw new Error(`${metricId}: admission policy requires failure_values`);
  }
  for (const value of policy.failure_values) {
    if (!metric.domain.includes(value) || ["INCONCLUSIVE", "NOT_APPLICABLE"].includes(value)) {
      throw new Error(`${metricId}: invalid admission failure value ${value}`);
    }
  }
  if (policy.kind === "CRITICAL_NON_INFERIOR_TO_BASELINE") {
    if (metric.admission_role !== "CRITICAL") {
      throw new Error(`${metricId}: critical policy requires CRITICAL role`);
    }
    if (typeof policy.new_task_failure_reject !== "boolean" ||
        !Number.isInteger(policy.repeated_same_task_threshold) ||
        policy.repeated_same_task_threshold < 1) {
      throw new Error(`${metricId}: malformed critical admission policy`);
    }
  }
  if (policy.kind === "MAX_ALLOWED_REGRESSION") {
    if (!Number.isInteger(policy.delta_ceiling) || policy.delta_ceiling < 0) {
      throw new Error(`${metricId}: malformed max-regression policy`);
    }
    if ("repeated_same_task_threshold" in policy &&
        (!Number.isInteger(policy.repeated_same_task_threshold) || policy.repeated_same_task_threshold < 1)) {
      throw new Error(`${metricId}: invalid repeated_same_task_threshold`);
    }
    if ("low_risk_repeated_threshold" in policy &&
        (!Number.isInteger(policy.low_risk_repeated_threshold) || policy.low_risk_repeated_threshold < 1)) {
      throw new Error(`${metricId}: invalid low_risk_repeated_threshold`);
    }
    if ("min_success_gain" in policy &&
        (!Number.isInteger(policy.min_success_gain) || policy.min_success_gain < 0)) {
      throw new Error(`${metricId}: invalid min_success_gain`);
    }
  }
}

export function validateContract(contract) {
  if (contract.schema_version !== "r4-evaluation-contract-v2") {
    throw new Error("evaluation contract schema is not v2");
  }
  if (contract.status !== "FROZEN_PRE_REGISTRATION") {
    throw new Error("evaluation contract is not frozen");
  }
  if (contract.authority_boundary?.hidden_qualification_payload_repository_visible !== false) {
    throw new Error("held-out development isolation is not mandatory");
  }
  if (contract.authority_boundary?.hidden_packet_repository_path !== null) {
    throw new Error("hidden packet cannot have a repository path");
  }
  if (contract.authority_boundary?.gold_input_prohibited !== true) {
    throw new Error("gold rubric input must be prohibited");
  }
  if (JSON.stringify(contract.authority_boundary?.model_input_fields) !== JSON.stringify(["prompt"])) {
    throw new Error("only neutral task prompt may be model input from evaluation material");
  }
  for (const name of ["NO_PRYZAEL", "CURRENT_PRYZAEL", "CANDIDATE_PRYZAEL"]) {
    if (!contract.conditions?.includes(name)) throw new Error(`missing condition: ${name}`);
  }
  for (const mode of [
    "CONDITIONED_BEHAVIOR", "NATIVE_AUTOMATIC_SKILL_SELECTION",
    "MCP_AUTOMATIC_TOOL_SELECTION", "FORCED_INVOCATION_CALIBRATION",
  ]) {
    if (!contract.activation_modes?.includes(mode)) throw new Error(`missing activation mode: ${mode}`);
  }

  const metricIds = Object.keys(contract.metric_definitions ?? {});
  if (metricIds.length === 0) throw new Error("metric definitions are empty");
  for (const metricId of metricIds) {
    const metric = contract.metric_definitions[metricId];
    for (const field of [
      "definition", "applicability_model", "domain", "polarity", "not_applicable",
      "inconclusive", "aggregation", "admission_role", "admission_policy",
    ]) {
      if (!(field in metric)) throw new Error(`${metricId}: metric missing ${field}`);
    }
    if (!APPLICABILITY_MODELS.has(metric.applicability_model)) {
      throw new Error(`${metricId}: invalid applicability model`);
    }
    if (!Array.isArray(metric.domain) || metric.domain.length === 0) {
      throw new Error(`${metricId}: metric domain is empty`);
    }
    if (!metric.polarity || metric.polarity === "UNKNOWN") {
      throw new Error(`${metricId}: metric polarity is unknown`);
    }
    if (!METRIC_ROLES.has(metric.admission_role)) {
      throw new Error(`${metricId}: invalid admission role`);
    }
    if (metric.applicability_model === "GLOBAL_REQUIRED") {
      if (metric.not_applicable !== "PROHIBITED" || metric.domain.includes("NOT_APPLICABLE")) {
        throw new Error(`${metricId}: global metric cannot permit NOT_APPLICABLE`);
      }
    } else if (!metric.domain.includes("NOT_APPLICABLE") || metric.not_applicable === "PROHIBITED") {
      throw new Error(`${metricId}: task-scoped metric must define NOT_APPLICABLE`);
    }
    validateAdmissionPolicy(metricId, metric);
  }

  if (contract.metric_definitions.EVIDENCE_ADEQUACY?.polarity !== "ADEQUATE_IS_BETTER") {
    throw new Error("EVIDENCE_ADEQUACY polarity must be explicit beneficial polarity");
  }
  if (contract.metric_definitions.FALSE_VERIFIED?.polarity !== "ABSENT_IS_BETTER") {
    throw new Error("FALSE_VERIFIED polarity must be explicit adverse polarity");
  }
  if (contract.metric_definitions.REPLANNING_COMPETENCE?.polarity !== "APPROPRIATE_REPLAN_IS_BETTER") {
    throw new Error("REPLANNING_COMPETENCE polarity is ambiguous");
  }
  if (contract.metric_definitions.SOLUTION_CLASS_COLLAPSE?.admission_role !== "DIAGNOSTIC" ||
      contract.metric_definitions.SOLUTION_CLASS_COLLAPSE?.admission_policy?.kind !== "DIAGNOSTIC_ONLY") {
    throw new Error("SOLUTION_CLASS_COLLAPSE must remain diagnostic");
  }
  if (contract.candidate_admission?.diagnostic_metrics_can_reject !== false) {
    throw new Error("diagnostic metrics must not independently reject");
  }
  if (contract.no_pryzael_control?.ordinary_engineering_tools_preserved !== true) {
    throw new Error("no-Pryzael control must preserve ordinary engineering tools");
  }
  if (contract.baseline_contamination_guard?.authoritative_baseline_measured !== false ||
      contract.baseline_contamination_guard?.held_out_results_observed !== false) {
    throw new Error("baseline contamination guard is not clean");
  }
  return true;
}

export function validateSchema(schema, contract) {
  const required = new Set(schema.required ?? []);
  for (const field of [
    "trial_id", "trial_index", "evaluation_identity", "task", "condition",
    "artifact_identity", "activation", "observable_environment",
    "predicate_observations", "metric_observations", "judge", "result", "limitations",
  ]) {
    if (!required.has(field)) throw new Error(`trial schema missing required authority field: ${field}`);
  }
  const conditionEnum = schema.properties?.condition?.enum ?? [];
  if (JSON.stringify(conditionEnum) !== JSON.stringify(contract.conditions)) {
    throw new Error("trial schema condition enum drifts from contract");
  }
}

export function validateQualificationPacketSchema(schema, contract) {
  const taskSchema = schema.properties?.tasks?.items;
  const applicability = taskSchema?.properties?.metric_applicability;
  const requiredTaskFields = new Set(taskSchema?.required ?? []);
  if (!requiredTaskFields.has("metric_applicability")) {
    throw new Error("qualification packet schema does not require metric_applicability");
  }
  if (applicability?.additionalProperties !== false) {
    throw new Error("qualification packet applicability must reject unknown metrics");
  }
  const expected = taskScopedMetricIds(contract).sort((a, b) => a.localeCompare(b, "en"));
  const required = [...(applicability?.required ?? [])].sort((a, b) => a.localeCompare(b, "en"));
  const properties = Object.keys(applicability?.properties ?? {}).sort((a, b) => a.localeCompare(b, "en"));
  if (JSON.stringify(required) !== JSON.stringify(expected) ||
      JSON.stringify(properties) !== JSON.stringify(expected)) {
    throw new Error("qualification packet applicability vocabulary drifts from metric registry");
  }
  for (const metricId of expected) {
    const values = applicability.properties[metricId]?.enum;
    if (JSON.stringify(values) !== JSON.stringify(["APPLICABLE", "NOT_APPLICABLE"])) {
      throw new Error(`${metricId}: qualification packet applicability enum drift`);
    }
  }
}

export function validateManifest(manifest) {
  if (manifest.schema_version !== "r4-public-authority-manifest-v2" || manifest.status !== "FROZEN") {
    throw new Error("public authority manifest is not frozen v2");
  }
  for (const [relative, expected] of Object.entries(manifest.files ?? {})) {
    const bytes = readBytes(relative);
    if (gitBlobSha1(bytes) !== expected.git_blob_sha1) {
      throw new Error(`${relative}: frozen Git blob identity mismatch`);
    }
  }
  if (manifest.held_out_development_isolation?.repository_visible_payload_allowed !== false) {
    throw new Error("manifest permits repository-visible hidden payload");
  }
}
