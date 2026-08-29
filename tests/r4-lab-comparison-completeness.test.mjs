import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ROOT,
  aggregateTrials,
  evaluateCandidateAdmission,
  loadQualificationAuthority,
  sha256,
  taskDigest,
  taskScopedMetricIds,
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
    task_id: `QLF-CMP-${String(index).padStart(3, "0")}`,
    partition: "QUALIFICATION",
    family,
    risk,
    prompt: `Synthetic comparison-completeness task ${index}.`,
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
    qualification_set_id: "synthetic-comparison-completeness-v1",
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
      observer_revision: "r4-comparison-completeness-v1",
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
        predicate_id: "success",
        predicate_role: "SUCCESS",
        result: "VERIFIED",
        applicability: "APPLICABLE",
        evidence_refs: ["synthetic"],
      },
      {
        predicate_id: "critical",
        predicate_role: "CRITICAL",
        result: "NOT_VERIFIED",
        applicability: "APPLICABLE",
        evidence_refs: ["synthetic"],
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
  const design = contract.trial_design.qualification_conditioned_behavior;
  for (const task of authority.qualification.packet.tasks) {
    for (const condition of design.conditions) {
      for (let index = 1; index <= design.N_per_task_per_condition; index += 1) {
        out.push(makeTrial(authority, task, condition, index));
      }
    }
  }
  return out;
}

function findTrial(trials, condition, family = null, index = 1) {
  return trials.find((trial) =>
    trial.condition === condition &&
    trial.trial_index === index &&
    (family === null || trial.task.family === family));
}

function setMetric(trial, metricId, value) {
  trial.metric_observations.find((item) => item.metric_id === metricId).value = value;
}

function setTrialResult(trial, result) {
  trial.result = result;
  setMetric(
    trial,
    "TASK_SUCCESS",
    result === "TASK_SUCCESS" ? "SUCCESS" :
      result === "INCONCLUSIVE" ? "INCONCLUSIVE" : "NOT_SUCCESS",
  );
}

test("CURRENT required trial INCONCLUSIVE blocks ADMIT", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const current = findTrial(trials, "CURRENT_PRYZAEL");
  setTrialResult(current, "INCONCLUSIVE");

  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "INCONCLUSIVE");
  assert.ok(result.reasons.some((reason) =>
    reason === "COMPARISON_EVIDENCE_INCOMPLETE: CURRENT_PRYZAEL"));
  assert.ok(result.reasons.some((reason) =>
    reason.startsWith("INCONCLUSIVE_TRIAL:") && reason.includes(current.trial_id)));
});

test("CURRENT applicable AUTHORITATIVE metric INCONCLUSIVE blocks ADMIT", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const current = findTrial(trials, "CURRENT_PRYZAEL");
  setMetric(current, "EVIDENCE_ADEQUACY", "INCONCLUSIVE");

  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "INCONCLUSIVE");
  assert.ok(result.reasons.some((reason) =>
    reason.includes("INCONCLUSIVE_AUTHORITATIVE_METRIC") &&
    reason.includes(`${current.trial_id}/EVIDENCE_ADEQUACY`)));
});

test("CURRENT required CRITICAL predicate INCONCLUSIVE blocks ADMIT", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const current = findTrial(trials, "CURRENT_PRYZAEL");
  current.predicate_observations.find((item) => item.predicate_role === "CRITICAL").result =
    "INCONCLUSIVE";
  setTrialResult(current, "PARTIAL_SUCCESS");

  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "INCONCLUSIVE");
  assert.ok(result.reasons.some((reason) =>
    reason.startsWith("CURRENT_CRITICAL_PREDICATE_INCONCLUSIVE:")));
});

test("conclusive bad CURRENT baseline remains comparable", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const current = findTrial(trials, "CURRENT_PRYZAEL");
  setMetric(current, "UNSUPPORTED_CLAIM", "MATERIAL");

  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "ADMIT");
});

test("CURRENT valid NOT_APPLICABLE remains distinct from INCONCLUSIVE", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const current = findTrial(trials, "CURRENT_PRYZAEL", "OBVIOUS_SINGLE_SOLUTION");
  const task = authority.qualification.tasks.get(current.task.task_id);
  assert.equal(task.metric_applicability.PREMATURE_CONVERGENCE, "NOT_APPLICABLE");
  assert.equal(
    current.metric_observations.find((item) => item.metric_id === "PREMATURE_CONVERGENCE").value,
    "NOT_APPLICABLE",
  );
  assert.equal(evaluateCandidateAdmission(trials, authority).decision, "ADMIT");
});

test("CANDIDATE authoritative INCONCLUSIVE remains fail closed", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const candidate = findTrial(trials, "CANDIDATE_PRYZAEL");
  setMetric(candidate, "EVIDENCE_ADEQUACY", "INCONCLUSIVE");

  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "INCONCLUSIVE");
  assert.ok(result.reasons.some((reason) =>
    reason.includes("INCONCLUSIVE_AUTHORITATIVE_METRIC")));
});

test("CANDIDATE critical INCONCLUSIVE remains fail closed", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const candidate = findTrial(trials, "CANDIDATE_PRYZAEL");
  candidate.predicate_observations.find((item) => item.predicate_role === "CRITICAL").result =
    "INCONCLUSIVE";
  setTrialResult(candidate, "PARTIAL_SUCCESS");

  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "INCONCLUSIVE");
  assert.ok(result.reasons.some((reason) =>
    reason.startsWith("INCONCLUSIVE_CRITICAL_PREDICATE:")));
});

test("complete CURRENT and CANDIDATE evidence keeps normal ADMIT path reachable", () => {
  const authority = makeAuthority();
  assert.equal(evaluateCandidateAdmission(completeTrials(authority), authority).decision, "ADMIT");
});

test("incomplete CURRENT metric cannot be erased into zero failures before comparison", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const current = findTrial(trials, "CURRENT_PRYZAEL");
  const candidate = findTrial(trials, "CANDIDATE_PRYZAEL");
  setMetric(current, "UNSUPPORTED_CLAIM", "INCONCLUSIVE");
  setMetric(candidate, "UNSUPPORTED_CLAIM", "MATERIAL");

  const aggregate = aggregateTrials(trials, authority);
  assert.equal(aggregate.metrics["UNSUPPORTED_CLAIM:INCONCLUSIVE"], 1);
  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "INCONCLUSIVE");
  assert.equal(
    result.reasons.some((reason) => reason.startsWith("AUTHORITATIVE_METRIC_REGRESSION:")),
    false,
  );
});

test("unrelated NO_PRYZAEL INCONCLUSIVE does not widen candidate comparison authority", () => {
  const authority = makeAuthority();
  const trials = completeTrials(authority);
  const control = findTrial(trials, "NO_PRYZAEL");
  setTrialResult(control, "INCONCLUSIVE");

  const result = evaluateCandidateAdmission(trials, authority);
  assert.equal(result.decision, "ADMIT");
  assert.equal(
    result.reasons.some((reason) => reason === "COMPARISON_EVIDENCE_INCOMPLETE: NO_PRYZAEL"),
    false,
  );
});
