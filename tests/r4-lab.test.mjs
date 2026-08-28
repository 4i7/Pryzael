import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { ROOT, aggregateTrials, taskDigest, validateLab, validateTrialResult } from "../scripts/r4_lab.mjs";

test("frozen R4 lab validates without observing behavioral outcomes", () => {
  const report = validateLab();
  assert.equal(report.status, "PASS");
  assert.equal(report.developmentTasks, 7);
  assert.equal(report.heldOutTasks, 7);
  assert.equal(report.routingCases, 80);
});

test("task digests are content-addressed and change when a predicate changes", () => {
  const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, "evaluation/corpus/development.json"), "utf8"));
  const task = structuredClone(corpus.tasks[0]);
  const original = task.digest;
  task.observable_success_predicates[0].statement += " changed";
  assert.notEqual(taskDigest(task), original);
});

test("aggregation is deterministic and keeps critical failures separate", () => {
  const base = {
    condition: "CURRENT_PRYZAEL",
    metric_results: [
      { metric: "FALSE_VERIFIED", result: "NOT_OBSERVED" },
      { metric: "UNSUPPORTED_CLAIM", result: "NOT_OBSERVED" },
      { metric: "INCONCLUSIVE_HANDLING", result: "NOT_APPLICABLE" },
      { metric: "EVIDENCE_ADEQUACY", result: "NOT_OBSERVED" },
      { metric: "UNSAFE_SCOPE_EXPANSION", result: "NOT_OBSERVED" },
      { metric: "AUTHORITY_ESCALATION", result: "NOT_OBSERVED" },
      { metric: "UNREQUESTED_MUTATION", result: "NOT_OBSERVED" },
      { metric: "ARTIFACT_IDENTITY_ERROR", result: "NOT_OBSERVED" },
    ],
    autonomy_diagnostics: { PREMATURE_CONVERGENCE: "NONE", PATH_OVERCONSTRAINT: "NONE", SOLUTION_CLASS_COLLAPSE: "NONE", REPLANNING_COMPETENCE: "NOT_APPLICABLE" },
    efficiency_observations: { CEREMONY_TAX: "NONE" },
  };
  const trials = [
    { ...base, trial_id: "2", task_id: "HLD-VERIFY-001", result: "CRITICAL_ERROR", metric_results: base.metric_results.map((item) => item.metric === "FALSE_VERIFIED" ? { ...item, result: "OBSERVED" } : item) },
    { ...base, trial_id: "1", task_id: "HLD-OBVIOUS-001", result: "TASK_SUCCESS" },
  ];
  assert.deepEqual(aggregateTrials(trials), aggregateTrials([...trials].reverse()));
  const aggregate = aggregateTrials(trials);
  assert.equal(aggregate.totals.TASK_SUCCESS, 1);
  assert.equal(aggregate.totals.CRITICAL_ERROR, 1);
  assert.equal(aggregate.critical.FALSE_VERIFIED, 1);
});

test("result-record validation requires all frozen epistemic/authority metrics", () => {
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "evaluation/contract.json"), "utf8"));
  const metrics = [...contract.metric_families.epistemic, ...contract.metric_families.authority]
    .map((metric) => ({ metric, result: "NOT_OBSERVED" }));
  const record = {
    trial_id: "synthetic-1",
    task_id: "DEV-SIMPLE-001",
    task_partition: "DEVELOPMENT",
    condition: "NO_PRYZAEL",
    artifact_identity: { pryzael_artifact_identity: "NONE", skill_package_identity: "NONE" },
    activation_mode: "CONDITIONED_BEHAVIOR",
    observable_environment: {
      native_or_mcp: "NONE", host_product_surface: "SYNTHETIC", model_identity: "SYNTHETIC",
      model_configuration: "SYNTHETIC", observer_revision: "r4-test", transport: "SYNTHETIC",
      timestamp: "SYNTHETIC", tool_availability: [], product_version: "SYNTHETIC",
    },
    outcome_predicates: [],
    metric_results: metrics,
    hard_invariant_results: [],
    heuristic_diagnostics: [],
    autonomy_diagnostics: {
      PREMATURE_CONVERGENCE: "NOT_APPLICABLE", PATH_OVERCONSTRAINT: "NOT_APPLICABLE",
      SOLUTION_CLASS_COLLAPSE: "NOT_APPLICABLE", REPLANNING_COMPETENCE: "NOT_APPLICABLE",
    },
    efficiency_observations: {
      CEREMONY_TAX: "NONE", UNNECESSARY_WORK: "NONE",
      TOKEN_USAGE: "UNKNOWN", TOOL_USAGE: "UNKNOWN", TURN_COUNT: "UNKNOWN",
    },
    evidence: [], judge: { identity: "SYNTHETIC", configuration: "SYNTHETIC", blinded_label: "SYNTHETIC" },
    result: "INCONCLUSIVE", limitations: ["Synthetic evaluator-mechanics fixture only."],
  };
  assert.equal(validateTrialResult(record, contract), true);
  record.metric_results = record.metric_results.filter((item) => item.metric !== "FALSE_VERIFIED");
  assert.throws(() => validateTrialResult(record, contract), /missing metric FALSE_VERIFIED/);
});

test("solution-class collapse remains a diagnostic rather than a critical aggregate", () => {
  const aggregate = aggregateTrials([{
    trial_id: "1",
    task_id: "HLD-OBVIOUS-001",
    condition: "CURRENT_PRYZAEL",
    result: "TASK_SUCCESS",
    metric_results: [],
    autonomy_diagnostics: {
      PREMATURE_CONVERGENCE: "NONE",
      PATH_OVERCONSTRAINT: "NONE",
      SOLUTION_CLASS_COLLAPSE: "MATERIAL",
      REPLANNING_COMPETENCE: "NOT_APPLICABLE",
    },
    efficiency_observations: { CEREMONY_TAX: "NONE" },
  }]);
  assert.equal(aggregate.critical.SOLUTION_CLASS_COLLAPSE, undefined);
  assert.equal(aggregate.autonomy["SOLUTION_CLASS_COLLAPSE:MATERIAL"], 1);
});
