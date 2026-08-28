import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVAL = path.join(ROOT, "evaluation");

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
}

function canonicalTaskBytes(task) {
  const copy = { ...task };
  delete copy.digest;
  return Buffer.from(JSON.stringify(sortDeep(copy)));
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b, "en"))
      .map(([key, item]) => [key, sortDeep(item)]),
  );
}

export function taskDigest(task) {
  return sha256(canonicalTaskBytes(task));
}

const FORBIDDEN_SUCCESS_TEXT = /\b(PRYZAEL|CANDIDATE_PRYZAEL|CURRENT_PRYZAEL|NO_PRYZAEL|HARD INVARIANT|HEURISTIC|OPTIONAL TECHNIQUE)\b/i;

function validateCorpus(corpus, expectedPartition, seen) {
  if (corpus.schema_version !== "r4-corpus-v1") throw new Error(`${expectedPartition}: unsupported corpus schema`);
  if (corpus.partition !== expectedPartition) throw new Error(`${expectedPartition}: partition mismatch`);
  if (!Array.isArray(corpus.tasks) || corpus.tasks.length === 0) throw new Error(`${expectedPartition}: empty corpus`);
  for (const task of corpus.tasks) {
    if (task.partition !== expectedPartition) throw new Error(`${task.task_id}: task partition mismatch`);
    if (!/^(DEV|HLD)-[A-Z0-9-]+$/.test(task.task_id)) throw new Error(`${task.task_id}: invalid task id`);
    if (seen.has(task.task_id)) throw new Error(`${task.task_id}: duplicate task id`);
    seen.add(task.task_id);
    if (task.digest !== taskDigest(task)) throw new Error(`${task.task_id}: frozen task digest mismatch`);
    if (typeof task.prompt !== "string" || task.prompt.trim().length < 40) throw new Error(`${task.task_id}: prompt is incomplete`);
    if (FORBIDDEN_SUCCESS_TEXT.test(task.prompt)) throw new Error(`${task.task_id}: task prompt leaks protocol/condition vocabulary`);
    if (!Array.isArray(task.observable_success_predicates) || task.observable_success_predicates.length === 0) {
      throw new Error(`${task.task_id}: missing observable success predicates`);
    }
    const predicateIds = new Set();
    for (const predicate of task.observable_success_predicates) {
      if (!predicate.id || predicateIds.has(predicate.id)) throw new Error(`${task.task_id}: duplicate/missing success predicate id`);
      predicateIds.add(predicate.id);
      if (!["OBJECTIVE", "SUBJECTIVE"].includes(predicate.kind)) throw new Error(`${task.task_id}:${predicate.id}: invalid predicate kind`);
      if (!predicate.statement || FORBIDDEN_SUCCESS_TEXT.test(predicate.statement)) {
        throw new Error(`${task.task_id}:${predicate.id}: success predicate is condition/protocol-coupled`);
      }
    }
    for (const predicate of task.critical_failure_predicates ?? []) {
      if (!predicate.id || predicateIds.has(predicate.id)) throw new Error(`${task.task_id}: duplicate critical predicate id`);
      predicateIds.add(predicate.id);
    }
  }
}

function assertRequiredFamilies(dev, held) {
  const families = new Set([...dev.tasks, ...held.tasks].map((task) => task.family));
  const required = [
    "BOUNDED_ROOT_CAUSE_DIAGNOSIS",
    "ARCHITECTURE_OWNERSHIP_DESIGN",
    "BLAST_RADIUS_COMPATIBILITY",
    "IMPLEMENTATION_PLANNING",
    "AMBIGUOUS_INCOMPLETE_EVIDENCE_INVESTIGATION",
    "VERIFICATION_COMPLETION_CLAIMS",
    "MIGRATION_STAGED_CHANGE_DESIGN",
    "LOW_RISK_SIMPLE_CHANGE",
    "PRESERVE_EXISTING_ARCHITECTURE",
    "EXISTING_ARCHITECTURE_IS_VIOLATED_ASSUMPTION",
    "LEGITIMATE_REPLANNING",
    "OBVIOUS_SINGLE_SOLUTION",
    "PREMATURE_CONVERGENCE_DANGEROUS",
  ];
  for (const family of required) {
    if (!families.has(family)) throw new Error(`missing required task family: ${family}`);
  }
}

function expandRoutingCases(routing) {
  if (routing.schema_version !== "r4-routing-v2") throw new Error("unsupported routing schema");
  const requiredTypes = [
    "CLEAR_POSITIVE","CLEAR_NEGATIVE","NEAR_NEIGHBOR","AMBIGUOUS",
    "COMPOUND","ADVERSARIAL","FRESH_CHAT_AUTOMATIC","FORCED_INVOCATION_CALIBRATION",
  ];
  if (JSON.stringify(routing.case_types) !== JSON.stringify(requiredTypes)) {
    throw new Error("routing case type contract drift");
  }
  const skillNames = Object.keys(routing.skills ?? {}).sort((a, b) => a.localeCompare(b, "en"));
  if (skillNames.length !== 10) throw new Error(`routing matrix expected 10 canonical Skills, found ${skillNames.length}`);
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

      const expected =
        caseType === "CLEAR_NEGATIVE" ? `NOT:${skill}` :
        caseType === "AMBIGUOUS" ? "INCONCLUSIVE_ALLOWED" :
        caseType === "COMPOUND" ? "MULTI_SKILL_ALLOWED" :
        skill;
      const admissionSurface =
        caseType === "FRESH_CHAT_AUTOMATIC" ? "NATIVE_AUTOMATIC_SKILL_SELECTION" :
        caseType === "FORCED_INVOCATION_CALIBRATION" ? "CALIBRATION_ONLY" :
        "ROUTING_DIAGNOSTIC";
      cases.push({
        case_id: `ROUTE-${skill.toUpperCase().replaceAll("-", "_")}-${caseType}`,
        skill,
        case_type: caseType,
        prompt,
        expected,
        admission_surface: admissionSurface,
      });
    }
  }
  return cases;
}

function validateRouting(routing) {
  const cases = expandRoutingCases(routing);
  const expectedMatrixDigest = sha256(Buffer.from(JSON.stringify(sortDeep(cases))));
  if (routing.matrix_digest !== expectedMatrixDigest) throw new Error("frozen routing matrix digest mismatch");
  for (const item of cases) {
    if (item.case_type === "FORCED_INVOCATION_CALIBRATION" && item.admission_surface !== "CALIBRATION_ONLY") {
      throw new Error(`${item.case_id}: forced invocation promoted to routing authority`);
    }
  }
  return cases.length;
}

function validateContract(contract) {
  if (contract.status !== "FROZEN_PRE_REGISTRATION") throw new Error("evaluation contract is not frozen");
  const conditions = new Set(contract.conditions ?? []);
  for (const name of ["NO_PRYZAEL","CURRENT_PRYZAEL","CANDIDATE_PRYZAEL"]) {
    if (!conditions.has(name)) throw new Error(`missing condition: ${name}`);
  }
  const modes = new Set(contract.activation_modes ?? []);
  for (const name of ["CONDITIONED_BEHAVIOR","NATIVE_AUTOMATIC_SKILL_SELECTION","MCP_TOOL_SELECTION","FORCED_INVOCATION_CALIBRATION"]) {
    if (!modes.has(name)) throw new Error(`missing activation mode: ${name}`);
  }
  if (contract.routing_admission?.native_and_mcp_pooled !== false) throw new Error("native and MCP observations must remain separate");
  if (contract.routing_admission?.forced_invocation_is_automatic_evidence !== false) throw new Error("forced invocation cannot be automatic-routing evidence");
  if (contract.authority_boundary?.gold_input_prohibited !== true) throw new Error("gold rubric input must be prohibited");
  if (JSON.stringify(contract.authority_boundary?.model_input_fields) !== JSON.stringify(["prompt"])) {
    throw new Error("only neutral task prompt may be model input from the corpus");
  }
  for (const key of ["trial_counts","judge_protocol","aggregation","candidate_admission","baseline_contamination_guard"]) {
    if (!contract[key]) throw new Error(`missing pre-registration section: ${key}`);
  }
}

function validateSchema(schema, contract) {
  const resultEnum = schema.properties?.result?.enum ?? [];
  if (JSON.stringify(resultEnum) !== JSON.stringify(contract.judge_protocol.allowed_trial_verdicts)) {
    throw new Error("trial result enum drifts from frozen judge protocol");
  }
  const conditionEnum = schema.properties?.condition?.enum ?? [];
  if (JSON.stringify(conditionEnum) !== JSON.stringify(contract.conditions)) {
    throw new Error("result schema condition enum drifts from contract");
  }
  const modeEnum = schema.properties?.activation_mode?.enum ?? [];
  if (JSON.stringify(modeEnum) !== JSON.stringify(contract.activation_modes)) {
    throw new Error("result schema activation enum drifts from contract");
  }
}

function validateManifest(manifest) {
  if (manifest.status !== "FROZEN") throw new Error("frozen manifest is not frozen");
  for (const [relative, expected] of Object.entries(manifest.files ?? {})) {
    const bytes = fs.readFileSync(path.join(ROOT, relative));
    if (sha256(bytes) !== expected.sha256 || bytes.length !== expected.bytes) {
      throw new Error(`${relative}: frozen file identity mismatch`);
    }
  }
}

export function validateLab() {
  const contract = readJson("evaluation/contract.json");
  const dev = readJson("evaluation/corpus/development.json");
  const held = readJson("evaluation/corpus/held-out.json");
  const routing = readJson("evaluation/routing-cases.json");
  const schema = readJson("evaluation/trial-result.schema.json");
  const manifest = readJson("evaluation/frozen-manifest.json");
  const seen = new Set();
  validateContract(contract);
  validateCorpus(dev, "DEVELOPMENT", seen);
  validateCorpus(held, "HELD_OUT", seen);
  assertRequiredFamilies(dev, held);
  const routingCaseCount = validateRouting(routing);
  validateSchema(schema, contract);
  validateManifest(manifest);
  return {
    status: "PASS",
    taskCount: seen.size,
    developmentTasks: dev.tasks.length,
    heldOutTasks: held.tasks.length,
    routingCases: routingCaseCount,
    contractStatus: contract.status,
  };
}


export function validateTrialResult(record, contract = readJson("evaluation/contract.json")) {
  const required = [
    "trial_id","task_id","task_partition","condition","artifact_identity","activation_mode",
    "observable_environment","outcome_predicates","metric_results","hard_invariant_results",
    "heuristic_diagnostics","autonomy_diagnostics","efficiency_observations","evidence","judge","result","limitations",
  ];
  for (const key of required) if (!(key in record)) throw new Error(`trial result missing ${key}`);
  if (!contract.conditions.includes(record.condition)) throw new Error(`invalid trial condition: ${record.condition}`);
  if (!contract.activation_modes.includes(record.activation_mode)) throw new Error(`invalid activation mode: ${record.activation_mode}`);
  if (!contract.judge_protocol.allowed_trial_verdicts.includes(record.result)) throw new Error(`invalid trial verdict: ${record.result}`);
  const requiredMetrics = [...contract.metric_families.epistemic, ...contract.metric_families.authority];
  const seen = new Set(record.metric_results.map((item) => item.metric));
  for (const metric of requiredMetrics) if (!seen.has(metric)) throw new Error(`trial result missing metric ${metric}`);
  if (record.activation_mode === "FORCED_INVOCATION_CALIBRATION" && record.task_partition !== "CALIBRATION") {
    throw new Error("forced-invocation calibration cannot be recorded as qualification task evidence");
  }
  return true;
}

const CRITICAL_METRICS = [
  "FALSE_VERIFIED","UNSAFE_SCOPE_EXPANSION","AUTHORITY_ESCALATION",
  "UNREQUESTED_MUTATION","ARTIFACT_IDENTITY_ERROR",
];

export function aggregateTrials(trials) {
  const sorted = [...trials].sort((a,b) =>
    [a.task_id,a.condition,a.trial_id ?? ""].join("\0").localeCompare([b.task_id,b.condition,b.trial_id ?? ""].join("\0"), "en")
  );
  const out = { totals: {}, byTask: {}, critical: {}, autonomy: {}, ceremony: {} };
  for (const trial of sorted) {
    out.totals[trial.result] = (out.totals[trial.result] ?? 0) + 1;
    out.byTask[trial.task_id] ??= {};
    out.byTask[trial.task_id][trial.result] = (out.byTask[trial.task_id][trial.result] ?? 0) + 1;
    const metricMap = Object.fromEntries((trial.metric_results ?? []).map((item) => [item.metric, item]));
    for (const metric of CRITICAL_METRICS) {
      if (metricMap[metric]?.result === "OBSERVED") out.critical[metric] = (out.critical[metric] ?? 0) + 1;
    }
    for (const metric of ["PREMATURE_CONVERGENCE","PATH_OVERCONSTRAINT","SOLUTION_CLASS_COLLAPSE","REPLANNING_COMPETENCE"]) {
      const value = trial.autonomy_diagnostics?.[metric];
      if (value) out.autonomy[`${metric}:${value}`] = (out.autonomy[`${metric}:${value}`] ?? 0) + 1;
    }
    const ceremony = trial.efficiency_observations?.CEREMONY_TAX;
    if (ceremony) out.ceremony[ceremony] = (out.ceremony[ceremony] ?? 0) + 1;
  }
  return out;
}
