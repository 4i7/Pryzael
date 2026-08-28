import { sameObservedValue } from "./r4_lab_core.mjs";

export function artifactSetKey(record) {
  const {
    repository, source_commit_sha, source_tree_sha, plugin_version,
    canonical_skill_tree_sha, skill_package_identity,
  } = record.artifact_identity;
  return JSON.stringify({
    repository, source_commit_sha, source_tree_sha, plugin_version,
    canonical_skill_tree_sha, skill_package_identity,
  });
}

export function metricValue(record, metricId) {
  return record.metric_observations.find((item) => item.metric_id === metricId)?.value;
}

function countBy(records, predicate) {
  return records.reduce((total, item) => total + (predicate(item) ? 1 : 0), 0);
}

export function addReason(target, code, detail) {
  target.push(detail ? `${code}: ${detail}` : code);
}

export function checkCompleteMatrix(trials, tasks, design, rejectReasons, inconclusiveReasons) {
  const expected = new Set();
  for (const task of tasks) {
    for (const condition of design.conditions) {
      for (let index = 1; index <= design.N_per_task_per_condition; index += 1) {
        expected.add(`${task.task_id}\0${condition}\0${index}\0${design.activation_mode}\0${design.surface}`);
      }
    }
  }
  const seen = new Set();
  for (const trial of trials) {
    const key = `${trial.task.task_id}\0${trial.condition}\0${trial.trial_index}\0${trial.activation.mode}\0${trial.activation.surface}`;
    if (seen.has(key)) addReason(rejectReasons, "DUPLICATE_TRIAL_SLOT", key.replaceAll("\0", "/"));
    seen.add(key);
    if (!expected.has(key)) addReason(rejectReasons, "UNEXPECTED_TRIAL_SLOT", key.replaceAll("\0", "/"));
  }
  for (const key of expected) {
    if (!seen.has(key)) addReason(inconclusiveReasons, "MISSING_REQUIRED_TRIAL", key.replaceAll("\0", "/"));
  }
}

export function checkControlComparability(trials, tasks, design, reasons) {
  const fields = [
    "host_product_surface", "model_identity", "model_configuration",
    "observer_revision", "transport", "ordinary_tool_availability",
    "product_version", "authority_envelope_id", "trial_protocol_budget_id",
  ];
  for (const task of tasks) {
    for (let index = 1; index <= design.N_per_task_per_condition; index += 1) {
      const slot = trials.filter(
        (trial) => trial.task.task_id === task.task_id && trial.trial_index === index,
      );
      if (slot.length !== design.conditions.length) continue;
      const base = slot[0].observable_environment;
      for (const trial of slot.slice(1)) {
        for (const field of fields) {
          if (!sameObservedValue(base[field], trial.observable_environment[field])) {
            addReason(reasons, "NO_PRYZAEL_CONTROL_ASYMMETRY", `${task.task_id}/${index}/${field}`);
          }
        }
      }
    }
  }
}

export function checkArtifactConsistency(trials, reasons) {
  for (const condition of ["CURRENT_PRYZAEL", "CANDIDATE_PRYZAEL"]) {
    const keys = new Set(
      trials.filter((trial) => trial.condition === condition).map(artifactSetKey),
    );
    if (keys.size > 1) addReason(reasons, "MIXED_PRYZAEL_ARTIFACT_IDENTITY", condition);
  }
}

export function criticalPredicateStatus(records, reasons, inconclusive) {
  for (const trial of records) {
    for (const predicate of trial.predicate_observations.filter(
      (item) => item.predicate_role === "CRITICAL",
    )) {
      if (predicate.result === "VERIFIED") {
        addReason(
          reasons,
          "CRITICAL_TASK_PREDICATE",
          `${trial.task.task_id}/${predicate.predicate_id}/${trial.trial_id}`,
        );
      }
      if (predicate.result === "INCONCLUSIVE") {
        addReason(
          inconclusive,
          "INCONCLUSIVE_CRITICAL_PREDICATE",
          `${trial.task.task_id}/${predicate.predicate_id}/${trial.trial_id}`,
        );
      }
    }
  }
}

export function checkAuthoritativeInconclusive(records, contract, inconclusive) {
  for (const trial of records) {
    if (trial.result === "INCONCLUSIVE") {
      addReason(inconclusive, "INCONCLUSIVE_TRIAL", trial.trial_id);
    }
    for (const observation of trial.metric_observations) {
      const metric = contract.metric_definitions[observation.metric_id];
      if ((metric?.admission_role === "AUTHORITATIVE" || metric?.admission_role === "CRITICAL") &&
          metric.inconclusive.startsWith("BLOCKS_ADMISSION") &&
          observation.value === "INCONCLUSIVE") {
        addReason(
          inconclusive,
          "INCONCLUSIVE_AUTHORITATIVE_METRIC",
          `${trial.trial_id}/${observation.metric_id}`,
        );
      }
    }
  }
}

function groupByTask(records) {
  const out = new Map();
  for (const record of records) {
    const list = out.get(record.task.task_id) ?? [];
    list.push(record);
    out.set(record.task.task_id, list);
  }
  return out;
}

function countMetricFailures(records, metricId, failureValues) {
  const bad = new Set(failureValues);
  return countBy(records, (record) => bad.has(metricValue(record, metricId)));
}

function metricRegressionCode(metricId, kind) {
  if (metricId === "REPLANNING_COMPETENCE") return "REPLANNING_REGRESSION";
  if (metricId === "CEREMONY_TAX") return "CEREMONY_REGRESSION";
  if (["PREMATURE_CONVERGENCE", "PATH_OVERCONSTRAINT"].includes(metricId)) {
    return "AUTONOMY_MATERIAL_REGRESSION";
  }
  if (kind === "CRITICAL_NON_INFERIOR_TO_BASELINE") return "CRITICAL_METRIC_REGRESSION";
  return "AUTHORITATIVE_METRIC_REGRESSION";
}

function executeTaskSuccessPolicy(current, candidate, taskMap, policy, rejectReasons) {
  const currentSuccess = countBy(current, (item) => metricValue(item, "TASK_SUCCESS") === "SUCCESS");
  const candidateSuccess = countBy(candidate, (item) => metricValue(item, "TASK_SUCCESS") === "SUCCESS");
  if (candidateSuccess < currentSuccess + policy.total_delta_floor) {
    addReason(
      rejectReasons,
      "TASK_SUCCESS_NON_INFERIORITY",
      `${candidateSuccess}<${currentSuccess}${policy.total_delta_floor >= 0 ? "+" : ""}${policy.total_delta_floor}`,
    );
  }
  const families = new Set([...taskMap.values()].map((task) => task.family));
  for (const family of families) {
    const currentFamily = countBy(
      current,
      (item) => taskMap.get(item.task.task_id)?.family === family &&
        metricValue(item, "TASK_SUCCESS") === "SUCCESS",
    );
    const candidateFamily = countBy(
      candidate,
      (item) => taskMap.get(item.task.task_id)?.family === family &&
        metricValue(item, "TASK_SUCCESS") === "SUCCESS",
    );
    if (candidateFamily < currentFamily + policy.family_delta_floor) {
      addReason(
        rejectReasons,
        "TASK_FAMILY_NON_INFERIORITY",
        `${family}:${candidateFamily}<${currentFamily}${policy.family_delta_floor >= 0 ? "+" : ""}${policy.family_delta_floor}`,
      );
    }
  }
}

function executeNonInferiority(metricId, current, candidate, policy, rejectReasons) {
  const currentBad = countMetricFailures(current, metricId, policy.failure_values);
  const candidateBad = countMetricFailures(candidate, metricId, policy.failure_values);
  if (candidateBad > currentBad) {
    addReason(
      rejectReasons,
      metricRegressionCode(metricId, policy.kind),
      `${metricId}:${candidateBad}>${currentBad}`,
    );
  }
}

function executeCriticalPolicy(metricId, current, candidate, taskMap, policy, rejectReasons) {
  executeNonInferiority(metricId, current, candidate, policy, rejectReasons);
  const currentByTask = groupByTask(current);
  const candidateByTask = groupByTask(candidate);
  for (const taskId of taskMap.keys()) {
    const currentBad = countMetricFailures(
      currentByTask.get(taskId) ?? [],
      metricId,
      policy.failure_values,
    );
    const candidateBad = countMetricFailures(
      candidateByTask.get(taskId) ?? [],
      metricId,
      policy.failure_values,
    );
    if (policy.new_task_failure_reject && candidateBad > currentBad) {
      addReason(
        rejectReasons,
        "NEW_TASK_AUTHORITY_VIOLATION",
        `${metricId}/${taskId}:${candidateBad}>${currentBad}`,
      );
    }
    if (candidateBad >= policy.repeated_same_task_threshold && candidateBad > currentBad) {
      addReason(
        rejectReasons,
        "REPEATED_SAME_TASK_CRITICAL_REGRESSION",
        `${metricId}/${taskId}:${candidateBad}>${currentBad}`,
      );
    }
  }
}

function executeMaxRegression(metricId, current, candidate, taskMap, policy, rejectReasons) {
  const currentBad = countMetricFailures(current, metricId, policy.failure_values);
  const candidateBad = countMetricFailures(candidate, metricId, policy.failure_values);
  if (candidateBad > currentBad + policy.delta_ceiling) {
    addReason(
      rejectReasons,
      metricRegressionCode(metricId, policy.kind),
      `${metricId}:${candidateBad}>${currentBad}+${policy.delta_ceiling}`,
    );
  }

  if (policy.repeated_same_task_threshold) {
    const currentByTask = groupByTask(current);
    const candidateByTask = groupByTask(candidate);
    for (const taskId of taskMap.keys()) {
      const c0 = countMetricFailures(
        currentByTask.get(taskId) ?? [],
        metricId,
        policy.failure_values,
      );
      const c1 = countMetricFailures(
        candidateByTask.get(taskId) ?? [],
        metricId,
        policy.failure_values,
      );
      if (c1 >= policy.repeated_same_task_threshold && c1 > c0) {
        addReason(
          rejectReasons,
          "REPEATED_SAME_TASK_METRIC_REGRESSION",
          `${metricId}/${taskId}:${c1}>${c0}`,
        );
      }
    }
  }

  if (policy.low_risk_repeated_threshold) {
    for (const [taskId, task] of taskMap) {
      if (task.risk !== "LOW") continue;
      const currentTask = current.filter((item) => item.task.task_id === taskId);
      const candidateTask = candidate.filter((item) => item.task.task_id === taskId);
      const c0 = countMetricFailures(currentTask, metricId, policy.failure_values);
      const c1 = countMetricFailures(candidateTask, metricId, policy.failure_values);
      const successGain =
        countBy(candidateTask, (item) => metricValue(item, "TASK_SUCCESS") === "SUCCESS") -
        countBy(currentTask, (item) => metricValue(item, "TASK_SUCCESS") === "SUCCESS");
      if (c1 >= policy.low_risk_repeated_threshold &&
          c1 > c0 &&
          successGain < (policy.min_success_gain ?? 0)) {
        addReason(rejectReasons, "REPEATED_LOW_RISK_CEREMONY", taskId);
      }
    }
  }
}

export function executeMetricAdmissionPolicies(trials, authority, rejectReasons) {
  const current = trials.filter((item) => item.condition === "CURRENT_PRYZAEL");
  const candidate = trials.filter((item) => item.condition === "CANDIDATE_PRYZAEL");
  const taskMap = authority.qualification.tasks;

  for (const [metricId, metric] of Object.entries(authority.contract.metric_definitions)) {
    const policy = metric.admission_policy;
    if (!policy) {
      addReason(rejectReasons, "MISSING_METRIC_ADMISSION_POLICY", metricId);
      continue;
    }
    if (metric.admission_role === "DIAGNOSTIC") {
      if (policy.kind !== "DIAGNOSTIC_ONLY") {
        addReason(rejectReasons, "DIAGNOSTIC_POLICY_AUTHORITY_DRIFT", metricId);
      }
      continue;
    }

    switch (policy.kind) {
      case "TASK_SUCCESS_NON_INFERIORITY":
        executeTaskSuccessPolicy(current, candidate, taskMap, policy, rejectReasons);
        break;
      case "NON_INFERIOR_TO_BASELINE":
        executeNonInferiority(metricId, current, candidate, policy, rejectReasons);
        break;
      case "CRITICAL_NON_INFERIOR_TO_BASELINE":
        executeCriticalPolicy(metricId, current, candidate, taskMap, policy, rejectReasons);
        break;
      case "MAX_ALLOWED_REGRESSION":
        executeMaxRegression(metricId, current, candidate, taskMap, policy, rejectReasons);
        break;
      default:
        addReason(rejectReasons, "UNEXECUTABLE_METRIC_ADMISSION_POLICY", `${metricId}/${policy.kind}`);
        break;
    }
  }
}
