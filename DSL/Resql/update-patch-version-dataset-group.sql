WITH update_latest AS (
    UPDATE dataset_group_metadata
    SET latest = false
    WHERE group_key = :group_key
    RETURNING 1
),
update_specific AS (
    UPDATE dataset_group_metadata
    SET
        patch_version = patch_version + 1,
        enable_allowed = false,
        validation_status = 'in-progress'::Validation_Status,
        is_enabled = false,
        latest = true,
        last_updated_timestamp = :last_updated_timestamp::timestamp with time zone
    WHERE id = :id
    RETURNING 1
)
SELECT 1;
