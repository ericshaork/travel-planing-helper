const ALLOWED_STATUSES = new Set(["pending", "processing", "completed", "failed"]);

function createTaskState(task) {
  return {
    task_id: task.task_id,
    asset_id: task.asset_id,
    status: "pending",
    history: [
      {
        status: "pending",
        at: new Date().toISOString(),
        reason: "Task initialized."
      }
    ]
  };
}

function transitionTaskStatus(taskState, nextStatus, reason) {
  if (!taskState || typeof taskState !== "object" || Array.isArray(taskState)) {
    throw new Error("taskState must be an object.");
  }

  if (!nextStatus || typeof nextStatus !== "string") {
    throw new Error("nextStatus must be a string.");
  }

  if (!ALLOWED_STATUSES.has(nextStatus)) {
    throw new Error(`nextStatus must be one of: ${Array.from(ALLOWED_STATUSES).join(", ")}.`);
  }

  taskState.status = nextStatus;
  taskState.history.push({
    status: nextStatus,
    at: new Date().toISOString(),
    reason: reason || ""
  });

  return taskState;
}

module.exports = {
  createTaskState,
  transitionTaskStatus,
  ALLOWED_STATUSES
};
