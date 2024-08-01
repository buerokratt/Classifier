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
    created_timestamp,
    connected_dg_id,
    connected_dg_name
) VALUES (
    :model_group_key,
    :model_name,
    :major_version,
    :minor_version,
    :latest,
    :maturity_label::Maturity_Label,
    :deployment_env::Deployment_Env,
    :training_status::Training_Status,
     ARRAY [:base_models]::Base_Models[],
    :created_timestamp::timestamp with time zone,
    :connected_dg_id,
    :connected_dg_name
) RETURNING id;