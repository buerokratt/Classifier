INSERT INTO models_metadata (
    model_group_key,
    model_name,
    major_version,
    minor_version,
    latest,
    maturity_label,
    deployment_env,
    training_status,
    base_models,
    last_trained_timestamp,
    created_timestamp,
    connected_dg_id,
    connected_dg_name,
    model_s3_location,
    inference_routes,
    training_results
)
SELECT
    model_group_key,
    model_name,
    (
        SELECT COALESCE(MAX(major_version), 0) + 1
               FROM models_metadata
               WHERE model_group_key = :group_key
        ) AS major_version,
    0 AS minor_version,
    true AS latest,
    :maturity_label::Maturity_Label,
    :deployment_env::Deployment_Env,
    'not trained'::Training_Status AS training_status,
    ARRAY [:base_models]::Base_Models[],
    NULL AS last_trained_timestamp,
    created_timestamp,
    :connected_dg_id,
    :connected_dg_name,
    NULL AS model_s3_location,
    NULL AS inference_routes,
    NULL AS training_results
FROM models_metadata
WHERE id = :id
RETURNING id;