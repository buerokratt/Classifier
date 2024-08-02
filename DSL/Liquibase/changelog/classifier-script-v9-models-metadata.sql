-- liquibase formatted sql

-- changeset kalsara Magamage:classifier-script-v9-changeset1
CREATE TYPE Maturity_Label AS ENUM ('development', 'staging', 'production');

-- changeset kalsara Magamage:classifier-script-v9-changeset2
CREATE TYPE Deployment_Env AS ENUM ('jira', 'outlook', 'pinal', 'testing', 'undeployed');

-- changeset kalsara Magamage:classifier-script-v9-changeset3
CREATE TYPE Training_Status AS ENUM ('not trained', 'training in progress', 'trained', 'retraining needed', 'untrainable');

-- changeset kalsara Magamage:classifier-script-v9-changeset4
CREATE TYPE Base_Models AS ENUM ('xlnet', 'roberta', 'albert');

-- changeset kalsara Magamage:classifier-script-v9-changeset5
CREATE TABLE models_metadata (
    id BIGINT NOT NULL GENERATED BY DEFAULT AS IDENTITY,
    model_group_key TEXT NOT NULL,
    model_name TEXT NOT NULL,
    major_version INT NOT NULL DEFAULT 0,
    minor_version INT NOT NULL DEFAULT 0,
    latest BOOLEAN DEFAULT false,
    maturity_label Maturity_Label,
    deployment_env Deployment_Env,
    training_status Training_Status,
    base_models Base_Models[],
    last_trained_timestamp TIMESTAMP WITH TIME ZONE,
    created_timestamp TIMESTAMP WITH TIME ZONE,
    connected_dg_id INT,
    connected_dg_name TEXT,
    model_s3_location TEXT,
    inference_routes JSONB,
    training_results JSONB,
    CONSTRAINT models_metadata_pkey PRIMARY KEY (id)
);

-- changeset kalsara Magamage:classifier-script-v9-changeset6
CREATE TABLE model_configurations (
    id BIGINT NOT NULL GENERATED BY DEFAULT AS IDENTITY,
    base_models Base_Models[],
    deployment_platforms Deployment_Env[],
    maturity_labels Maturity_Label[],
    CONSTRAINT model_configurations_pkey PRIMARY KEY (id)
);

-- changeset kalsara Magamage:classifier-script-v9-changeset7
INSERT INTO model_configurations (base_models, deployment_platforms, maturity_labels) VALUES
(
    ARRAY['xlnet', 'roberta', 'albert']::Base_Models[],
    ARRAY['jira', 'outlook', 'pinal', 'testing', 'undeployed']::Deployment_Env[],
    ARRAY['development', 'staging', 'production']::Maturity_Label[]
);