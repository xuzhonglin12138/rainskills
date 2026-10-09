export function validateEvidenceTrace(events) {
  const validSnapshotEvidence = new Set();
  const usedPollScopes = new Set();
  const exhaustedEvidence = new Set();
  const errors = [];

  for (const event of events) {
    if (event.kind === "write") {
      for (const key of event.invalidates || []) validSnapshotEvidence.delete(key);
      continue;
    }
    if (event.kind === "snapshot") {
      if (event.valid !== false) {
        for (const key of event.evidence_keys || []) validSnapshotEvidence.add(key);
      }
      continue;
    }
    if (event.kind === "poll") {
      if (usedPollScopes.has(event.poll_scope)) errors.push("duplicate_poll_scope");
      else usedPollScopes.add(event.poll_scope);
      if (event.outcome === "budget_exhausted") exhaustedEvidence.add(event.evidence_key);
      continue;
    }
    if (event.kind === "read") {
      if (exhaustedEvidence.has(event.evidence_key)) {
        errors.push("query_after_poll_budget_exhausted");
      } else if (validSnapshotEvidence.has(event.evidence_key)) {
        errors.push("duplicate_read_after_snapshot");
      }
    }
  }

  return [...new Set(errors)];
}
