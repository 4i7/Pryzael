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
  "judge_reference_material", "gold", "answer", "expected_answer",
]);

export function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
export function gitBlobSha1(value) { const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value); return crypto.createHash("sha1").update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex"); }
export function sortDeep(value) { if (Array.isArray(value)) return value.map(sortDeep); if (!value || typeof value !== "object") return value; return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b,"en")).map(([key,item]) => [key,sortDeep(item)])); }
function canonicalBytes(value, omitted = []) { const copy = structuredClone(value); for (const key of omitted) delete copy[key]; return Buffer.from(JSON.stringify(sortDeep(copy))); }
export function taskDigest(task) { return sha256(canonicalBytes(task,["digest"])); }
export function routingCaseDigest(item) { return sha256(canonicalBytes(item)); }
export function readBytes(relative) { return fs.readFileSync(path.join(ROOT,relative)); }
export function readJson(relative) { return JSON.parse(readBytes(relative).toString("utf8")); }
export function publicProtocolIdentity(contract) { return `${contract.protocol_revision.id}@${contract.protocol_revision.protocol_blob_sha}`; }
function isUnknown(value) { return value === "UNKNOWN"; }
export function sameObservedValue(a,b) { if (isUnknown(a)||isUnknown(b)) return true; return JSON.stringify(a)===JSON.stringify(b); }
export function assertObject(value,label) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}: expected object`); }
export function assertExactKeys(value,required,allowed,label) { assertObject(value,label); for (const key of required) if (!(key in value)) throw new Error(`${label}: missing ${key}`); for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${label}: unknown field ${key}`); }

function validateDevelopmentTask(task,seen) {
  if (task.partition !== "DEVELOPMENT") throw new Error(`${task.task_id}: development partition mismatch`);
  if (!/^DEV-[A-Z0-9-]+$/.test(task.task_id)) throw new Error(`${task.task_id}: invalid development task id`);
  if (seen.has(task.task_id)) throw new Error(`${task.task_id}: duplicate task id`); seen.add(task.task_id);
  if (task.digest !== taskDigest(task)) throw new Error(`${task.task_id}: frozen task digest mismatch`);
  if (typeof task.prompt !== "string" || task.prompt.trim().length < 40) throw new Error(`${task.task_id}: prompt is incomplete`);
  if (FORBIDDEN_PROMPT_TEXT.test(task.prompt)) throw new Error(`${task.task_id}: prompt leaks condition/protocol vocabulary`);
  const ids = new Set();
  for (const [role,predicates] of [["success",task.observable_success_predicates],["critical",task.critical_failure_predicates ?? []]]) {
    if (role === "success" && (!Array.isArray(predicates)||predicates.length===0)) throw new Error(`${task.task_id}: missing observable success predicates`);
    for (const predicate of predicates ?? []) { if (!predicate.id || ids.has(predicate.id)) throw new Error(`${task.task_id}: duplicate/missing predicate id`); ids.add(predicate.id); if (!["OBJECTIVE","SUBJECTIVE"].includes(predicate.kind)) throw new Error(`${task.task_id}:${predicate.id}: invalid predicate kind`); if (!predicate.statement || FORBIDDEN_PROMPT_TEXT.test(predicate.statement)) throw new Error(`${task.task_id}:${predicate.id}: predicate is condition/protocol-coupled`); }
  }
}
export function validateDevelopmentCorpus(corpus) { if (corpus.schema_version !== "r4-corpus-v1" || corpus.partition !== "DEVELOPMENT") throw new Error("development corpus authority mismatch"); if (!Array.isArray(corpus.tasks)||corpus.tasks.length!==7) throw new Error("development corpus expected exactly 7 preserved tasks"); const seen=new Set(); for (const task of corpus.tasks) validateDevelopmentTask(task,seen); return new Map(corpus.tasks.map((task)=>[task.task_id,task])); }

export function expandRoutingCases(routing) {
  if (routing.schema_version !== "r4-routing-v2") throw new Error("unsupported routing schema");
  const requiredTypes=["CLEAR_POSITIVE","CLEAR_NEGATIVE","NEAR_NEIGHBOR","AMBIGUOUS","COMPOUND","ADVERSARIAL","FRESH_CHAT_AUTOMATIC","FORCED_INVOCATION_CALIBRATION"];
  if (JSON.stringify(routing.case_types)!==JSON.stringify(requiredTypes)) throw new Error("routing case type contract drift");
  const skillNames=Object.keys(routing.skills ?? {}).sort((a,b)=>a.localeCompare(b,"en")); if (skillNames.length!==10) throw new Error(`routing matrix expected 10 canonical Skills, found ${skillNames.length}`);
  const cases=[];
  for (const skill of skillNames) { const prompts=routing.skills[skill]; if (!prompts?.positive || !prompts?.negative || !prompts?.near_neighbor) throw new Error(`${skill}: incomplete routing prompt family`); for (const caseType of requiredTypes) { let prompt; if (caseType==="CLEAR_POSITIVE"||caseType==="FRESH_CHAT_AUTOMATIC") prompt=prompts.positive; else if (caseType==="CLEAR_NEGATIVE") prompt=prompts.negative; else if (caseType==="NEAR_NEIGHBOR") prompt=prompts.near_neighbor; else if (caseType==="AMBIGUOUS") prompt=routing.shared_prompts?.ambiguous; else if (caseType==="COMPOUND") prompt=routing.shared_prompts?.compound; else if (caseType==="ADVERSARIAL") prompt=`${routing.shared_prompts?.adversarial_prefix ?? ""}${prompts.positive}`; else prompt=`${(routing.shared_prompts?.forced_prefix ?? "").replace("{skill}",skill)}${prompts.positive}`; if (!prompt) throw new Error(`${skill}:${caseType}: missing resolved routing prompt`); const expected=caseType==="CLEAR_NEGATIVE"?`NOT:${skill}`:caseType==="AMBIGUOUS"?"INCONCLUSIVE_ALLOWED":caseType==="COMPOUND"?"MULTI_SKILL_ALLOWED":skill; const admissionSurface=caseType==="FRESH_CHAT_AUTOMATIC"?"NATIVE_AUTOMATIC_SKILL_SELECTION":caseType==="CLEAR_POSITIVE"?"MCP_AUTOMATIC_TOOL_SELECTION_ELIGIBLE":caseType==="FORCED_INVOCATION_CALIBRATION"?"CALIBRATION_ONLY":"ROUTING_DIAGNOSTIC"; const item={case_id:`ROUTE-${skill.toUpperCase().replaceAll("-","_")}-${caseType}`,skill,case_type:caseType,prompt,expected,admission_surface:admissionSurface}; cases.push({...item,digest:routingCaseDigest(item)}); } }
  const withoutDigests=cases.map(({digest,...item})=>item); const matrixDigest=sha256(Buffer.from(JSON.stringify(sortDeep(withoutDigests)))); if (routing.matrix_digest!==matrixDigest) throw new Error("frozen routing matrix digest mismatch"); return cases;
}

export function validateContract(contract) {
  if (contract.schema_version!=="r4-evaluation-contract-v2") throw new Error("evaluation contract schema is not v2"); if (contract.status!=="FROZEN_PRE_REGISTRATION") throw new Error("evaluation contract is not frozen");
  if (contract.authority_boundary?.hidden_qualification_payload_repository_visible!==false) throw new Error("held-out development isolation is not mandatory"); if (contract.authority_boundary?.hidden_packet_repository_path!==null) throw new Error("hidden packet cannot have a repository path"); if (contract.authority_boundary?.gold_input_prohibited!==true) throw new Error("gold rubric input must be prohibited"); if (JSON.stringify(contract.authority_boundary?.model_input_fields)!==JSON.stringify(["prompt"])) throw new Error("only neutral task prompt may be model input from evaluation material");
  for (const name of ["NO_PRYZAEL","CURRENT_PRYZAEL","CANDIDATE_PRYZAEL"]) if (!contract.conditions?.includes(name)) throw new Error(`missing condition: ${name}`); for (const mode of ["CONDITIONED_BEHAVIOR","NATIVE_AUTOMATIC_SKILL_SELECTION","MCP_AUTOMATIC_TOOL_SELECTION","FORCED_INVOCATION_CALIBRATION"]) if (!contract.activation_modes?.includes(mode)) throw new Error(`missing activation mode: ${mode}`);
  const metricIds=Object.keys(contract.metric_definitions ?? {}); if (metricIds.length===0) throw new Error("metric definitions are empty"); const validRoles=new Set(["AUTHORITATIVE","CRITICAL","DIAGNOSTIC"]); for (const metricId of metricIds) { const metric=contract.metric_definitions[metricId]; for (const field of ["definition","applicability","domain","polarity","not_applicable","inconclusive","aggregation","admission_role"]) if (!(field in metric)) throw new Error(`${metricId}: metric missing ${field}`); if (!Array.isArray(metric.domain)||metric.domain.length===0) throw new Error(`${metricId}: metric domain is empty`); if (!metric.polarity||metric.polarity==="UNKNOWN") throw new Error(`${metricId}: metric polarity is unknown`); if (!validRoles.has(metric.admission_role)) throw new Error(`${metricId}: invalid admission role`); }
  if (contract.metric_definitions.EVIDENCE_ADEQUACY?.polarity!=="ADEQUATE_IS_BETTER") throw new Error("EVIDENCE_ADEQUACY polarity must be explicit beneficial polarity"); if (contract.metric_definitions.FALSE_VERIFIED?.polarity!=="ABSENT_IS_BETTER") throw new Error("FALSE_VERIFIED polarity must be explicit adverse polarity"); if (contract.metric_definitions.REPLANNING_COMPETENCE?.polarity!=="APPROPRIATE_REPLAN_IS_BETTER") throw new Error("REPLANNING_COMPETENCE polarity is ambiguous"); if (contract.metric_definitions.SOLUTION_CLASS_COLLAPSE?.admission_role!=="DIAGNOSTIC") throw new Error("SOLUTION_CLASS_COLLAPSE must remain diagnostic"); if (contract.no_pryzael_control?.ordinary_engineering_tools_preserved!==true) throw new Error("no-Pryzael control must preserve ordinary engineering tools"); if (contract.baseline_contamination_guard?.authoritative_baseline_measured!==false || contract.baseline_contamination_guard?.held_out_results_observed!==false) throw new Error("baseline contamination guard is not clean");
}
export function validateSchema(schema,contract) { const required=new Set(schema.required ?? []); for (const field of ["trial_id","trial_index","evaluation_identity","task","condition","artifact_identity","activation","observable_environment","predicate_observations","metric_observations","judge","result","limitations"]) if (!required.has(field)) throw new Error(`trial schema missing required authority field: ${field}`); const conditionEnum=schema.properties?.condition?.enum ?? []; if (JSON.stringify(conditionEnum)!==JSON.stringify(contract.conditions)) throw new Error("trial schema condition enum drifts from contract"); }
export function validateManifest(manifest) { if (manifest.schema_version!=="r4-public-authority-manifest-v2" || manifest.status!=="FROZEN") throw new Error("public authority manifest is not frozen v2"); for (const [relative,expected] of Object.entries(manifest.files ?? {})) { const bytes=readBytes(relative); if (gitBlobSha1(bytes)!==expected.git_blob_sha1) throw new Error(`${relative}: frozen Git blob identity mismatch`); } if (manifest.held_out_development_isolation?.repository_visible_payload_allowed!==false) throw new Error("manifest permits repository-visible hidden payload"); }
