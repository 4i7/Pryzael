import fs from "node:fs";
import path from "node:path";
import {
  ROOT, expandRoutingCases, readJson, validateContract, validateDevelopmentCorpus,
  validateManifest, validateQualificationPacketSchema, validateSchema,
} from "./r4_lab_core.mjs";
import {
  validateDevelopmentIsolation,
  validateQualificationCommitment,
} from "./r4_lab_qualification.mjs";

export {
  ROOT, sha256, gitBlobSha1, sortDeep, taskDigest, routingCaseDigest,
  expandRoutingCases, validateContract, taskScopedMetricIds,
  validateTaskMetricApplicability, validateQualificationPacketSchema,
} from "./r4_lab_core.mjs";
export {
  validateQualificationCommitment, validateQualificationPacket,
  loadQualificationAuthority, validateDevelopmentIsolation,
  buildPublicAuthority, buildEvaluationAuthority,
} from "./r4_lab_qualification.mjs";
export { validateTrialResult } from "./r4_lab_trial.mjs";
export {
  evaluateCandidateAdmission, evaluateRoutingAdmission, aggregateTrials,
} from "./r4_lab_admission.mjs";

export function validateLab() {
  const contract = readJson("evaluation/contract.json");
  const development = readJson("evaluation/corpus/development.json");
  const routing = readJson("evaluation/routing-cases.json");
  const schema = readJson("evaluation/trial-result.schema.json");
  const packetSchema = readJson("evaluation/qualification-packet.schema.json");
  const commitmentSchema = readJson("evaluation/qualification-commitment.schema.json");
  const manifest = readJson("evaluation/frozen-manifest.json");

  validateContract(contract);
  validateDevelopmentCorpus(development, contract);
  const routingCases = expandRoutingCases(routing);
  validateSchema(schema, contract);
  if (packetSchema.properties?.schema_version?.const !== contract.qualification_packet.schema_version) {
    throw new Error("qualification packet schema drifts from contract");
  }
  validateQualificationPacketSchema(packetSchema, contract);
  if (commitmentSchema.properties?.status?.const !== "FROZEN_BEFORE_BASELINE") {
    throw new Error("qualification commitment schema does not enforce pre-baseline freeze");
  }
  validateManifest(manifest);
  validateDevelopmentIsolation({contract, manifest});

  const commitmentPath = path.join(
    ROOT,
    contract.authority_boundary.qualification_commitment_path,
  );
  let commitmentStatus = "PENDING_INDEPENDENT_FREEZE";
  if (fs.existsSync(commitmentPath)) {
    validateQualificationCommitment(
      JSON.parse(fs.readFileSync(commitmentPath, "utf8")),
      contract,
    );
    commitmentStatus = "FROZEN_PUBLIC_COMMITMENT_PRESENT";
  }

  return {
    status: "PASS",
    developmentTasks: development.tasks.length,
    repositoryVisibleHeldOutTasks: 0,
    routingCases: routingCases.length,
    hiddenPacketCreated: false,
    qualificationCommitment: commitmentStatus,
    metricDefinitions: Object.keys(contract.metric_definitions).length,
    taskScopedMetricDefinitions: Object.values(contract.metric_definitions)
      .filter((metric) => metric.applicability_model === "TASK_SCOPED").length,
    admissionPolicies: Object.values(contract.metric_definitions)
      .filter((metric) => ["AUTHORITATIVE", "CRITICAL"].includes(metric.admission_role))
      .length,
    authoritativeBaselineMeasured:
      contract.baseline_contamination_guard.authoritative_baseline_measured,
    heldOutResultsObserved:
      contract.baseline_contamination_guard.held_out_results_observed,
  };
}
