SELECT id as dg_id, group_name, major_version, minor_version, patch_version
FROM dataset_group_metadata
WHERE is_enabled = true AND validation_status = 'success';