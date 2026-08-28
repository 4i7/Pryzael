import fs from "node:fs";
import path from "node:path";
import { ROOT, expandRoutingCases, readJson, validateContract, validateDevelopmentCorpus, validateManifest, validateSchema } from "./r4_lab_core.mjs";
import { validateDevelopmentIsolation, validateQualificationCommitment } from "./r4_lab_qualification.mjs";

export { ROOT, sha256, gitBlobSha1, sortDeep, taskDigest, routingCaseDigest, expandRoutingCases } from "./r4_lab_core.mjs";
export { validateQualificationCommitment, validateQualificationPacket, loadQualificationAuthority, validateDevelopmentIsolation, buildPublicAuthority, buildEvaluationAuthority } from "./r4_lab_qualification.mjs";
export { validateTrialResult } from "./r4_lab_trial.mjs";
export { evaluateCandidateAdmission, evaluateRoutingAdmission, aggregateTrials } from "./r4_lab_admission.mjs";

export function validateLab() {
  const contract=readJson("evaluation/contract.json"), development=readJson("evaluation/corpus/development.json"), routing=readJson("evaluation/routing-cases.json"), schema=readJson("evaluation/trial-result.schema.json"), packetSchema=readJson("evaluation/qualification-packet.schema.json"), commitmentSchema=readJson("evaluation/qualification-commitment.schema.json"), manifest=readJson("evaluation/frozen-manifest.json");
  validateContract(contract); validateDevelopmentCorpus(development); const routingCases=expandRoutingCases(routing); validateSchema(schema,contract); if (packetSchema.properties?.schema_version?.const!==contract.qualification_packet.schema_version) throw new Error("qualification packet schema drifts from contract"); if (commitmentSchema.properties?.status?.const!=="FROZEN_BEFORE_BASELINE") throw new Error("qualification commitment schema does not enforce pre-baseline freeze"); validateManifest(manifest); validateDevelopmentIsolation({contract,manifest});
  const commitmentPath=path.join(ROOT,contract.authority_boundary.qualification_commitment_path); let commitmentStatus="PENDING_INDEPENDENT_FREEZE"; if (fs.existsSync(commitmentPath)) { validateQualificationCommitment(JSON.parse(fs.readFileSync(commitmentPath,"utf8")),contract); commitmentStatus="FROZEN_PUBLIC_COMMITMENT_PRESENT"; }
  return {status:"PASS",developmentTasks:development.tasks.length,repositoryVisibleHeldOutTasks:0,routingCases:routingCases.length,hiddenPacketCreated:false,qualificationCommitment:commitmentStatus,metricDefinitions:Object.keys(contract.metric_definitions).length,authoritativeBaselineMeasured:contract.baseline_contamination_guard.authoritative_baseline_measured,heldOutResultsObserved:contract.baseline_contamination_guard.held_out_results_observed};
}
