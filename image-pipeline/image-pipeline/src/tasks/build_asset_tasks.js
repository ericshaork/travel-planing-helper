function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildAssetInstanceId(item) {
  return `${item.asset_id}_${item.image_slot}`;
}

function buildAssetTask(item, index, manifest) {
  const assetInstanceId = buildAssetInstanceId(item);

  return {
    task_id: `task_${assetInstanceId}`,
    asset_id: item.asset_id,
    asset_instance_id: assetInstanceId,
    manifest_id: manifest.manifest_id,
    image_slot: item.image_slot,
    type: item.type,
    source_preference: item.source_preference,
    mode: item.generation_mode,
    generation_mode: item.generation_mode,
    decision_reason: item.decision_reason,
    prompt: item.prompt,
    metadata: {
      ...item.metadata,
      manifest_index: index
    },
    status: "pending"
  };
}

function buildAssetTasks(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("manifest must be an object.");
  }

  const items = toArray(manifest.items);

  if (items.length === 0) {
    throw new Error("manifest.items must contain at least one entry.");
  }

  return items.map((item, index) => buildAssetTask(item, index, manifest));
}

module.exports = {
  buildAssetTasks,
  buildAssetInstanceId
};
