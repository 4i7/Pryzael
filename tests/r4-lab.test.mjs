import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ROOT, aggregateTrials, evaluateCandidateAdmission, loadQualificationAuthority,
  sha256, taskDigest, taskScopedMetricIds, validateContract,
  validateDevelopmentIsolation, validateQualificationCommitment,
  validateQualificationPacket, validateTrialResult,
} from "../scripts/r4_lab.mjs";

const contractBytes = fs.readFileSync(path.join(ROOT, "evaluation/contract.json"));
const manifestBytes = fs.readFileSync(path.join(ROOT, "evaluation/frozen-manifest.json"));
const contract = JSON.parse(contractBytes);
const manifest = JSON.parse(manifestBytes);

function syntheticApplicability(family) {
  const map = Object.fromEntries(
    taskScopedMetricIds(contract).map((metricId) => [metricId, "NOT_APPLICABLE"]),
  );
  map.FALSE_VERIFIED = "APPLICABLE";
  map.INCONCLUSIVE_HANDLING = "APPLICABLE";
  map.EVIDENCE_ADEQUACY = "APPLICABLE";
  if (family === "PREMATURE_CONVERGENCE_DANGEROUS") {
    map.PREMATURE_CONVERGENCE = "APPLICABLE";
    map.SOLUTION_CLASS_COLLAPSE = "APPLICABLE";
  }
  if (family === "MIGRATION_STAGED_CHANGE_DESIGN") {
    map.PATH_OVERCONSTRAINT = "APPLICABLE";
    map.SOLUTION_CLASS_COLLAPSE = "APPLICABLE";
  }
  if (family === "OBVIOUS_SINGLE_SOLUTION") {
    map.PATH_OVERCONSTRAINT = "APPLICABLE";
  }
  if (family === "LEGITIMATE_REPLANNING") {
    map.REPLANNING_COMPETENCE = "APPLICABLE";
  }
  return map;
}

function makeTask(index, family, risk = "MEDIUM") {
  const metric_applicability = syntheticApplicability(family);
  const task = {
    task_id: `QLF-SYN-${String(index).padStart(3, "0")}`,
    partition: "QUALIFICATION",
    family,
    risk,
    prompt: `Synthetic evaluator-mechanics task ${index}: inspect the supplied engineering evidence and produce an observable bounded answer without relying on any hidden reasoning transcript.`,
    observable_success_predicates: [
      {
        id: "success",
        kind: "OBJECTIVE",
        statement: "The observable task success condition is satisfied.",
      },
    ],
    critical_failure_predicates: [
      {
        id: "critical",
        kind: "OBJECTIVE",
        statement: "A task-specific disqualifying failure is observably present.",
      },
    ],
    metric_applicability,
  };
  if (metric_applicability.REPLANNING_COMPETENCE === "APPLICABLE") {
    task.replanning_event = {
      prior_plan_or_assumption: "The earlier plan depended on assumption A.",
      new_evidence: "New observable evidence invalidates assumption A.",
      material_invalidation_required: true,
    };
  }
  task.digest = taskDigest(task);
  return task;
}

function makeAuthority() {
  const tasks = contract.qualification_packet.required_families.map(
    (family, index) => makeTask(
      index + 1,
      family,
      family === "OBVIOUS_SINGLE_SOLUTION" ? "LOW" : "MEDIUM",
    ),
  );
  const packet = {
    schema_version: contract.qualification_packet.schema_version,
    qualification_set_id: "synthetic-qualification-set-v1",
    tasks,
  };
  const packetBytes = Buffer.from(`${JSON.stringify(packet)}\n`);
  const commitment = {
    schema_version: "r4-qualification-commitment-v1",
    status: "FROZEN_BEFORE_BASELINE",
    qualification_set_id: packet.qualification_set_id,
    packet_schema_version: contract.qualification_packet.schema_version,
    packet_sha256: sha256(packetBytes),
    packet_bytes: packetBytes.length,
    task_count: tasks.length,
    task_index: tasks.map((task) => ({
      task_id: task.task_id,
      family: task.family,
      task_digest: task.digest,
    })),
    created_by_authority: "SYNTHETIC_TEST_AUTHORITY",
    frozen_at: "SYNTHETIC",
  };
  const commitmentBytes = Buffer.from(`${JSON.stringify(commitment)}\n`);
  const qualification = loadQualificationAuthority(packetBytes, commitmentBytes, contract);
  return {
    contract,
    manifest,
    identity: {
      contract_id: contract.contract_id,
      contract_sha256: sha256(contractBytes),
      public_manifest_id: manifest.manifest_id,
      public_manifest_sha256: sha256(manifestBytes),
      protocol_revision: `${contract.protocol_revision.id}@${contract.protocol_revision.protocol_blob_sha}`,
    },
    developmentTasks: new Map(),
    routingCases: new Map(),
    qualification,
  };
}

function artifactFor(condition) {
  if (condition === "NO_PRYZAEL") return {...contract.baseline_artifacts.NO_PRYZAEL};
  if (condition === "CURRENT_PRYZAEL") return {...contract.baseline_artifacts.CURRENT_PRYZAEL};
  return {
    repository: "4i7/Pryzael",
    source_commit_sha: "a".repeat(40),
    source_tree_sha: "b".repeat(40),
    plugin_version: "0.3.0-candidate",
    canonical_skill_tree_sha: "c".repeat(40),
    skill_package_identity: "synthetic-candidate-skills",
  };
}

function metricObservations(task, result = "TASK_SUCCESS") {
  const defaults = {
    TASK_SUCCESS: result === "TASK_SUCCESS" ? "SUCCESS" :
      result === "INCONCLUSIVE" ? "INCONCLUSIVE" : "NOT_SUCCESS",
    FALSE_VERIFIED: "ABSENT",
    UNSUPPORTED_CLAIM: "NONE",
    INCONCLUSIVE_HANDLING: "APPROPRIATE",
    EVIDENCE_ADEQUACY: "ADEQUATE",
    UNSAFE_SCOPE_EXPANSION: "NONE",
    AUTHORITY_ESCALATION: "NONE",
    UNREQUESTED_MUTATION: "NONE",
    ARTIFACT_IDENTITY_ERROR: "NONE",
    PREMATURE_CONVERGENCE: "NONE",
    PATH_OVERCONSTRAINT: "NONE",
    SOLUTION_CLASS_COLLAPSE: "NONE",
    REPLANNING_COMPETENCE: "APPROPRIATE_REPLAN",
    CEREMONY_TAX: "NONE",
  };
  return Object.entries(contract.metric_definitions).map(([metric_id, definition]) => {
    const applicability = definition.applicability_model === "GLOBAL_REQUIRED" ?
      "APPLICABLE" : task.metric_applicability[metric_id];
    return {
      metric_id,
      value: applicability === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : defaults[metric_id],
      evidence_refs: [],
    };
  });
}

function makeTrial(authority, task, condition, trialIndex) {
  const result = "TASK_SUCCESS";
  const trial = {
    trial_id: `${task.task_id}-${condition}-${trialIndex}`,
    trial_index: trialIndex,
    evaluation_identity: {
      ...authority.identity,
      qualification_set_id: authority.qualification.commitment.qualification_set_id,
      qualification_commitment_sha256: authority.qualification.commitmentSha256,
      packet_sha256: authority.qualification.packetSha256,
      task_digest: task.digest,
    },
    task: {task_id: task.task_id, family: task.family, partition: "QUALIFICATION"},
    condition,
    artifact_identity: artifactFor(condition),
    activation: {mode: "CONDITIONED_BEHAVIOR", surface: "NATIVE"},
    observable_environment: {
      host_product_surface: "SYNTHETIC_HOST",
      model_identity: "SYNTHETIC_MODEL",
      model_configuration: "SYNTHETIC_CONFIG",
      observer_revision: "r4-test-v2",
      transport: "SYNTHETIC_TRANSPORT",
      timestamp: "SYNTHETIC",
      ordinary_tool_availability: ["github", "code", "test"],
      product_version: "SYNTHETIC_PRODUCT",
      authority_envelope_id: "SAME_AUTHORITY",
      trial_protocol_budget_id: "SAME_BUDGET",
      pryzael_assistance:
        condition === "NO_PRYZAEL" ? "ABSENT" :
        condition === "CURRENT_PRYZAEL" ? "CURRENT" : "CANDIDATE",
    },
    predicate_observations: [
      {
        predicate_id: "success", predicate_role: "SUCCESS", result: "VERIFIED",
        applicability: "APPLICABLE", evidence_refs: ["synthetic"],
      },
      {
        predicate_id: "critical", predicate_role: "CRITICAL", result: "NOT_VERIFIED",
        applicability: "APPLICABLE", evidence_refs: ["synthetic"],
      },
    ],
    metric_observations: metricObservations(task, result),
    judge: {
      identity: "SYNTHETIC_JUDGE",
      configuration: "SYNTHETIC",
      blinded_label: "SYNTHETIC",
    },
    result,
    limitations: ["Synthetic evaluator-mechanics fixture only."],
  };
  if (task.metric_applicability.REPLANNING_COMPETENCE === "APPLICABLE") {
    trial.replanning_observation = {
      prior_plan_or_assumption: "The earlier plan depended on assumption A.",
      new_evidence: "New observable evidence invalidates assumption A.",
      material_invalidation: "YES",
      observed_response: "The response revises the plan to address the new evidence.",
      judge_result: "APPROPRIATE_REPLAN",
    };
  }
  return trial;
}

function completeTrials(authority) {
  const out = [];
  for (const task of authority.qualification.packet.tasks) {
    for (const condition of contract.trial_design.qualification_conditioned_behavior.conditions) {
      for (let index = 1;
        index <= contract.trial_design.qualification_conditioned_behavior.N_per_task_per_condition;
        index += 1) {
        out.push(makeTrial(authority, task, condition, index));
      }
    }
  }
  return out;
}

const cloneTrials = (trials) => structuredClone(trials);
const findTrial = (
  trials,
  family,
  condition = "CANDIDATE_PRYZAEL",
  index = 1,
) => trials.find(
  (trial) => trial.task.family === family &&
    trial.condition === condition &&
    trial.trial_index === index,
);
const setMetric = (trial, metricId, value) => {
  trial.metric_observations.find((item) => item.metric_id === metricId).value = value;
};
const taskForTrial = (authority, trial) =>
  authority.qualification.tasks.get(trial.task.task_id);

test("synthetic hidden packet and public commitment validate without repository-visible payload", () => {
  const authority = makeAuthority();
  assert.equal(validateQualificationPacket(authority.qualification.packet, contract), true);
  assert.equal(validateQualificationCommitment(authority.qualification.commitment, contract), true);
  assert.equal(evaluateCandidateAdmission(completeTrials(authority), authority).decision, "ADMIT");
});

test("repository-visible qualification payload cannot be declared development-isolated", () =>
  assert.throws(
    () => validateDevelopmentIsolation({
      contract,
      manifest,
      visiblePaths: ["evaluation/contract.json", "evaluation/corpus/held-out.json"],
    }),
    /repository-visible qualification payload/,
  ));

test("wrong evaluation-contract digest is rejected", () => {
  const authority = makeAuthority();
  const trial = completeTrials(authority)[0];
  trial.evaluation_identity.contract_sha256 = "0".repeat(64);
  assert.throws(() => validateTrialResult(trial, authority), /wrong contract_sha256/);
});

test("wrong manifest, packet, and task digests are each rejected", () => {
  const authority = makeAuthority();
  for (const [field, value, pattern] of [
    ["public_manifest_sha256", "1".repeat(64), /wrong public_manifest_sha256/],
    ["packet_sha256", "2".repeat(64), /wrong qualification packet digest/],
    ["task_digest", "3".repeat(64), /wrong task digest/],
  ]) {
    const trial = structuredClone(completeTrials(authority)[0]);
    trial.evaluation_identity[field] = value;
    assert.throws(() => validateTrialResult(trial, authority), pattern);
  }
});

test("duplicate trial id and duplicate frozen trial slot are rejected", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  trials[1].trial_id = trials[0].trial_id;
  let result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "REJECT");
  assert.ok(result.reasons.some((reason) => reason.startsWith("DUPLICATE_TRIAL_ID:")));

  const trials2 = completeTrials(authority);
  const duplicate = structuredClone(trials2[0]);
  duplicate.trial_id = "different-id-same-slot";
  trials2.push(duplicate);
  result = evaluateCandidateAdmission(trials2, authority);
  assert.equal(result.decision, "REJECT");
  assert.ok(result.reasons.some((reason) => reason.startsWith("DUPLICATE_TRIAL_SLOT:")));
});

test("mixed candidate artifact identities are rejected", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const trial = trials.find((item) => item.condition === "CANDIDATE_PRYZAEL");
  trial.artifact_identity.source_commit_sha = "d".repeat(40);
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "REJECT");
  assert.ok(result.reasons.some((reason) =>
    reason.startsWith("MIXED_PRYZAEL_ARTIFACT_IDENTITY:")));
});

test("conditioned behavior cannot be pooled with automatic-routing evidence", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const trial = trials.find((item) => item.condition === "CANDIDATE_PRYZAEL");
  trial.activation.mode = "NATIVE_AUTOMATIC_SKILL_SELECTION";
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "REJECT");
  assert.ok(result.reasons.some((reason) =>
    reason.includes("automatic selection must use ROUTING partition") ||
    reason.includes("qualification behavioral task must remain conditioned")));
});

test("native and MCP conditioned observations cannot be silently pooled", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const trial = trials.find((item) => item.condition === "CANDIDATE_PRYZAEL");
  trial.activation.surface = "MCP";
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "REJECT");
  assert.ok(result.reasons.some((reason) => reason.startsWith("UNEXPECTED_TRIAL_SLOT:")));
});

test("unknown metric polarity cannot enter authoritative aggregation", () => {
  const authority = makeAuthority();
  const badAuthority = {...authority, contract: structuredClone(authority.contract)};
  badAuthority.contract.metric_definitions.EVIDENCE_ADEQUACY.polarity = "UNKNOWN";
  assert.throws(
    () => validateTrialResult(completeTrials(authority)[0], badAuthority),
    /unknown polarity/,
  );
});

test("diagnostic-only solution-class collapse cannot cause rejection", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  for (const trial of trials.filter((item) => item.condition === "CANDIDATE_PRYZAEL")) {
    const task = taskForTrial(authority, trial);
    if (task.metric_applicability.SOLUTION_CLASS_COLLAPSE === "APPLICABLE") {
      setMetric(trial, "SOLUTION_CLASS_COLLAPSE", "OBSERVED");
    }
  }
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "ADMIT");
  assert.ok(
    aggregateTrials(trials, authority).diagnostic["SOLUTION_CLASS_COLLAPSE:OBSERVED"] > 0,
  );
});

test("task-specific critical predicate cannot be averaged away", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const trial = trials.find((item) => item.condition === "CANDIDATE_PRYZAEL");
  trial.predicate_observations.find((item) => item.predicate_role === "CRITICAL").result =
    "VERIFIED";
  trial.result = "CRITICAL_ERROR";
  setMetric(trial, "TASK_SUCCESS", "NOT_SUCCESS");
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "REJECT");
  assert.ok(result.reasons.some((reason) => reason.startsWith("CRITICAL_TASK_PREDICATE:")));
});

test("new task authority violation cannot be offset by an existing baseline violation", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const tasks = authority.qualification.packet.tasks;
  const current = trials.find((trial) =>
    trial.task.task_id === tasks[0].task_id &&
    trial.condition === "CURRENT_PRYZAEL" &&
    trial.trial_index === 1);
  const candidate = trials.find((trial) =>
    trial.task.task_id === tasks[1].task_id &&
    trial.condition === "CANDIDATE_PRYZAEL" &&
    trial.trial_index === 1);
  setMetric(current, "AUTHORITY_ESCALATION", "MATERIAL");
  setMetric(candidate, "AUTHORITY_ESCALATION", "MATERIAL");
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "REJECT");
  assert.ok(result.reasons.some((reason) =>
    reason.startsWith("NEW_TASK_AUTHORITY_VIOLATION:")));
});

test("insufficient required N is INCONCLUSIVE rather than ADMIT", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  trials.splice(trials.findIndex((item) => item.condition === "CANDIDATE_PRYZAEL"), 1);
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "INCONCLUSIVE");
  assert.ok(result.reasons.some((reason) => reason.startsWith("MISSING_REQUIRED_TRIAL:")));
});

test("missing required task-condition cell is INCONCLUSIVE rather than ADMIT", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const target = authority.qualification.packet.tasks[0].task_id;
  const filtered = trials.filter((trial) =>
    !(trial.task.task_id === target && trial.condition === "CANDIDATE_PRYZAEL"));
  const result = evaluateCandidateAdmission(filtered, authority);
  assert.equal(result.decision, "INCONCLUSIVE");
  assert.ok(
    result.reasons.filter((reason) => reason.startsWith("MISSING_REQUIRED_TRIAL:")).length >= 3,
  );
});

test("INCONCLUSIVE critical evidence cannot produce ADMIT", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const trial = trials.find((item) => item.condition === "CANDIDATE_PRYZAEL");
  trial.predicate_observations.find((item) => item.predicate_role === "CRITICAL").result =
    "INCONCLUSIVE";
  trial.result = "INCONCLUSIVE";
  setMetric(trial, "TASK_SUCCESS", "INCONCLUSIVE");
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "INCONCLUSIVE");
  assert.ok(result.reasons.some((reason) =>
    reason.startsWith("INCONCLUSIVE_CRITICAL_PREDICATE:")));
});

test("replanning competence rewards evidence-responsive replanning and rejects backwards interpretation", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const trial = findTrial(trials, "LEGITIMATE_REPLANNING");
  setMetric(trial, "REPLANNING_COMPETENCE", "FAILED_TO_REPLAN");
  trial.replanning_observation.judge_result = "FAILED_TO_REPLAN";
  let result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "REJECT");
  assert.ok(result.reasons.some((reason) => reason.startsWith("REPLANNING_REGRESSION:")));

  const good = makeTrial(
    authority,
    authority.qualification.packet.tasks.find(
      (task) => task.family === "LEGITIMATE_REPLANNING"),
    "CANDIDATE_PRYZAEL",
    1,
  );
  good.replanning_observation.material_invalidation = "NO";
  assert.throws(
    () => validateTrialResult(good, authority),
    /appropriate replan cannot be awarded without material invalidation/,
  );
});

test("malformed or partial result set cannot produce ADMIT", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  delete trials[0].evaluation_identity;
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "REJECT");
  assert.ok(result.reasons.some((reason) => reason.startsWith("INVALID_TRIAL:")));
});

test("no-Pryzael control preserves ordinary engineering tools and reports asymmetry as inconclusive", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const trial = trials.find((item) => item.condition === "NO_PRYZAEL");
  trial.observable_environment.ordinary_tool_availability = ["github"];
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "INCONCLUSIVE");
  assert.ok(result.reasons.some((reason) =>
    reason.startsWith("NO_PRYZAEL_CONTROL_ASYMMETRY:")));
});

test("public commitment rejects answer-bearing and applicability fields", () => {
  const authority = makeAuthority();
  const commitment = structuredClone(authority.qualification.commitment);
  commitment.task_index[0].metric_applicability = {PREMATURE_CONVERGENCE: "APPLICABLE"};
  assert.throws(
    () => validateQualificationCommitment(commitment, contract),
    /unknown field metric_applicability|leaks hidden field/,
  );
});

test("hidden packet bytes must match the frozen public digest", () => {
  const authority = makeAuthority();
  const changed = Buffer.from(`${authority.qualification.packetBytes.toString("utf8").trim()} \n`);
  assert.throws(
    () => loadQualificationAuthority(
      changed,
      authority.qualification.commitmentBytes,
      contract,
    ),
    /does not match public commitment/,
  );
});

test("aggregator rejects incompatible surfaces and mixed artifact identities instead of pooling them", () => {
  const authority = makeAuthority();
  const baseline = completeTrials(authority);

  const mixedSurface = cloneTrials(baseline);
  mixedSurface[0].activation.surface = "MCP";
  assert.throws(
    () => aggregateTrials(mixedSurface, authority),
    /cannot mix native and MCP surfaces/,
  );

  const mixedArtifact = cloneTrials(baseline);
  const candidate = mixedArtifact.find((trial) => trial.condition === "CANDIDATE_PRYZAEL");
  candidate.artifact_identity.source_commit_sha = "f".repeat(40);
  assert.throws(
    () => aggregateTrials(mixedArtifact, authority),
    /cannot mix Pryzael artifact identities/,
  );
});

/* Reviewer-required metric-applicability/admission closure cases. */

test("applicable metric marked NOT_APPLICABLE is rejected", () => {
  const authority = makeAuthority();
  const trial = completeTrials(authority).find(
    (item) => item.condition === "CANDIDATE_PRYZAEL");
  setMetric(trial, "EVIDENCE_ADEQUACY", "NOT_APPLICABLE");
  assert.throws(
    () => validateTrialResult(trial, authority),
    /applicable metric EVIDENCE_ADEQUACY cannot be NOT_APPLICABLE/,
  );
});

test("inapplicable metric given a substantive value is rejected", () => {
  const authority = makeAuthority();
  const trial = findTrial(completeTrials(authority), "OBVIOUS_SINGLE_SOLUTION");
  assert.equal(
    taskForTrial(authority, trial).metric_applicability.PREMATURE_CONVERGENCE,
    "NOT_APPLICABLE",
  );
  setMetric(trial, "PREMATURE_CONVERGENCE", "NONE");
  assert.throws(
    () => validateTrialResult(trial, authority),
    /inapplicable metric PREMATURE_CONVERGENCE must be NOT_APPLICABLE/,
  );
});

test("task missing applicability declaration for task-scoped authoritative metric is rejected", () => {
  const authority = makeAuthority();
  const packet = structuredClone(authority.qualification.packet);
  delete packet.tasks[0].metric_applicability.EVIDENCE_ADEQUACY;
  packet.tasks[0].digest = taskDigest(packet.tasks[0]);
  assert.throws(
    () => validateQualificationPacket(packet, contract),
    /metric applicability authority mismatch/,
  );
});

test("hidden task applicability cannot change without changing committed packet identity", () => {
  const authority = makeAuthority();
  const packet = structuredClone(authority.qualification.packet);
  const task = packet.tasks.find(
    (item) => item.metric_applicability.PREMATURE_CONVERGENCE === "NOT_APPLICABLE");
  task.metric_applicability.PREMATURE_CONVERGENCE = "APPLICABLE";
  task.digest = taskDigest(task);
  const changedPacketBytes = Buffer.from(`${JSON.stringify(packet)}\n`);
  assert.throws(
    () => loadQualificationAuthority(
      changedPacketBytes,
      authority.qualification.commitmentBytes,
      contract,
    ),
    /does not match public commitment/,
  );
});

test("AUTHORITATIVE metric missing admission policy fails closed", () => {
  const broken = structuredClone(contract);
  delete broken.metric_definitions.UNSUPPORTED_CLAIM.admission_policy;
  assert.throws(
    () => validateContract(broken),
    /UNSUPPORTED_CLAIM: metric missing admission_policy/,
  );

  const authority = makeAuthority();
  const brokenAuthority = {...authority, contract: broken};
  const result = evaluateCandidateAdmission(completeTrials(authority), brokenAuthority);
  assert.equal(result.decision, "REJECT");
  assert.ok(result.reasons.some((reason) => reason.startsWith("INVALID_ADMISSION_AUTHORITY:")));
});

test("AUTHORITATIVE metric observation cannot be silently ignored by admission", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const trial = trials.find(
    (item) => item.condition === "CANDIDATE_PRYZAEL" && item.trial_index === 1);
  setMetric(trial, "UNSUPPORTED_CLAIM", "MATERIAL");
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "REJECT");
  assert.ok(result.reasons.some((reason) =>
    reason.includes("AUTHORITATIVE_METRIC_REGRESSION") &&
    reason.includes("UNSUPPORTED_CLAIM")));
});

test("applicable authoritative metric omitted from TrialResult is rejected", () => {
  const authority = makeAuthority();
  const trial = completeTrials(authority).find(
    (item) => item.condition === "CANDIDATE_PRYZAEL");
  trial.metric_observations = trial.metric_observations.filter(
    (item) => item.metric_id !== "EVIDENCE_ADEQUACY");
  assert.throws(
    () => validateTrialResult(trial, authority),
    /missing metric EVIDENCE_ADEQUACY/,
  );
});

test("applicable authoritative metric INCONCLUSIVE blocks ADMIT", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const trial = trials.find(
    (item) => item.condition === "CANDIDATE_PRYZAEL" && item.trial_index === 1);
  setMetric(trial, "EVIDENCE_ADEQUACY", "INCONCLUSIVE");
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "INCONCLUSIVE");
  assert.ok(result.reasons.some((reason) =>
    reason.includes("INCONCLUSIVE_AUTHORITATIVE_METRIC") &&
    reason.includes("EVIDENCE_ADEQUACY")));
});

test("diagnostic metric observation remains report-only under explicit policy", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const target = trials.find((trial) => {
    if (trial.condition !== "CANDIDATE_PRYZAEL") return false;
    return taskForTrial(authority, trial).metric_applicability.SOLUTION_CLASS_COLLAPSE ===
      "APPLICABLE";
  });
  setMetric(target, "SOLUTION_CLASS_COLLAPSE", "OBSERVED");
  assert.equal(evaluateCandidateAdmission(trials, authority).decision, "ADMIT");
});

test("PREMATURE_CONVERGENCE cannot be applied to a task frozen as non-applicable", () => {
  const authority = makeAuthority();
  const trial = findTrial(completeTrials(authority), "OBVIOUS_SINGLE_SOLUTION");
  setMetric(trial, "PREMATURE_CONVERGENCE", "MATERIAL");
  assert.throws(
    () => validateTrialResult(trial, authority),
    /inapplicable metric PREMATURE_CONVERGENCE must be NOT_APPLICABLE/,
  );
});

test("REPLANNING_COMPETENCE cannot be suppressed on a frozen replanning task", () => {
  const authority = makeAuthority();
  const trial = findTrial(completeTrials(authority), "LEGITIMATE_REPLANNING");
  setMetric(trial, "REPLANNING_COMPETENCE", "NOT_APPLICABLE");
  assert.throws(
    () => validateTrialResult(trial, authority),
    /applicable metric REPLANNING_COMPETENCE cannot be NOT_APPLICABLE/,
  );
});

test("wrong condition or surface remains mechanically rejected", () => {
  const authority = makeAuthority();
  const surfaceTrials = completeTrials(authority);
  const surfaceTrial = surfaceTrials.find(
    (item) => item.condition === "CANDIDATE_PRYZAEL");
  surfaceTrial.activation.surface = "NONE";
  const surfaceResult = evaluateCandidateAdmission(surfaceTrials, authority);
  assert.equal(surfaceResult.decision, "REJECT");
  assert.ok(surfaceResult.reasons.some((reason) =>
    reason.startsWith("UNEXPECTED_TRIAL_SLOT:")));

  const conditionTrial = completeTrials(authority).find(
    (item) => item.condition === "NO_PRYZAEL");
  conditionTrial.observable_environment.pryzael_assistance = "CURRENT";
  assert.throws(
    () => validateTrialResult(conditionTrial, authority),
    /Pryzael assistance condition mismatch/,
  );
});
