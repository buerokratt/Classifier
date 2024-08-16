import { FC, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card } from 'components';
import { useDialog } from 'hooks/useDialog';
import BackArrowButton from 'assets/BackArrowButton';
import {
  deleteDataModel,
  getMetadata,
  retrainDataModel,
  updateDataModel,
} from 'services/data-models';
import DataModelForm from 'components/molecules/DataModelForm';
import { getChangedAttributes } from 'utils/dataModelsUtils';
import { Platform, UpdateType } from 'enums/dataModelsEnums';
import { ButtonAppearanceTypes } from 'enums/commonEnums';
import CircularSpinner from 'components/molecules/CircularSpinner/CircularSpinner';
import { DataModel, UpdatedDataModelPayload } from 'types/dataModels';
import { dataModelsQueryKeys } from 'utils/queryKeys';

type ConfigureDataModelType = {
  id: number;
  availableProdModels?: string[];
};

const ConfigureDataModel: FC<ConfigureDataModelType> = ({
  id,
  availableProdModels,
}) => {
  const { open, close } = useDialog();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState<boolean>(true);
  const [initialData, setInitialData] = useState<Partial<DataModel>>({
    modelName: '',
    dgId: '',
    platform: '',
    baseModels: [],
    maturity: '',
    version: '',
  });
  const [dataModel, setDataModel] = useState<DataModel>({
    modelId: 0,
    modelName: '',
    dgId: '',
    platform: '',
    baseModels: [],
    maturity: '',
    version: '',
  });

  const { isLoading } = useQuery(
    dataModelsQueryKeys.GET_META_DATA(id),
    () => getMetadata(id),
    {
      enabled,
      onSuccess: (data) => {
        setDataModel({
          modelId: data?.modelId || 0,
          modelName: data?.modelName || '',
          dgId: data?.connectedDgId || '',
          platform: data?.deploymentEnv || '',
          baseModels: data?.baseModels || [],
          maturity: data?.maturityLabel || '',
          version: `V${data?.majorVersion}.${data?.minorVersion}`,
        });
        setInitialData({
          modelName: data?.modelName || '',
          dgId: data?.connectedDgId || 0,
          platform: data?.deploymentEnv || '',
          baseModels: data?.baseModels || [],
          maturity: data?.maturityLabel || '',
          version: `V${data?.majorVersion}.${data?.minorVersion}`,
        });
        setEnabled(false);
      },
    }
  );

  const handleDataModelAttributesChange = (
    name: keyof DataModel,
    value: any
  ) => {
    setDataModel((prevDataModel) => ({
      ...prevDataModel,
      [name]: value,
    }));
  };

  const handleSave = () => {
    const payload = getChangedAttributes(initialData, dataModel);
    let updateType: string | undefined;
    if (payload.dgId) {
      updateType = UpdateType.MAJOR;
    } else if (payload.baseModels || payload.platform) {
      updateType = UpdateType.MINOR;
    } else if (payload.maturity) {
      updateType = UpdateType.MATURITY_LABEL;
    }

    const updatedPayload = {
      modelId: dataModel.modelId,
      connectedDgId: payload.dgId,
      deploymentEnv: payload.platform,
      baseModels: payload.baseModels,
      maturityLabel: payload.maturity,
      updateType:updateType,
    };

    if (updateType) {
      if (availableProdModels?.includes(dataModel.platform)) {
        open({
          title: 'Warning: Replace Production Model',
          content:
            'Adding this model to production will replace the current production model. Are you sure you want to proceed?',
          footer: (
            <div className="flex-grid">
              <Button
                appearance={ButtonAppearanceTypes.SECONDARY}
                onClick={close}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateDataModelMutation.mutate(updatedPayload)}
              >
                Proceed
              </Button>
            </div>
          ),
        });
      } else {
        updateDataModelMutation.mutate(updatedPayload);
      }
    }
  };

  const updateDataModelMutation = useMutation({
    mutationFn: (data: UpdatedDataModelPayload) => updateDataModel(data),
    onSuccess: async () => {
      open({
        title: 'Changes Saved Successfully',
        content: (
          <p>
            You have successfully saved the changes. You can view the data model
            in the "All Data Models" view.
          </p>
        ),
        footer: (
          <div className="flex-grid">
            <Button
              appearance={ButtonAppearanceTypes.SECONDARY}
              onClick={() => {
                navigate(0);
                close();
              }}
            >
              Cancel
            </Button>{' '}
            <Button
              onClick={() => {
                navigate(0);
                close();
              }}
            >
              View All Data Models
            </Button>
          </div>
        ),
      });
    },
    onError: () => {
      open({
        title: 'Error Updating Data Model',
        content: (
          <p>
            There was an issue updating the data model. Please try again. If the
            problem persists, contact support for assistance.
          </p>
        ),
      });
    },
  });

  const handleDelete = () => {
    if (
      dataModel.platform === Platform.JIRA ||
      dataModel.platform === Platform.OUTLOOK ||
      dataModel.platform === Platform.PINAL
    ) {
      open({
        title: 'Cannot Delete Model',
        content: (
          <p>
            The model cannot be deleted because it is currently in production.
            Please escalate another model to production before proceeding to
            delete this model.
          </p>
        ),
        footer: (
          <div className="flex-grid">
            <Button
              appearance={ButtonAppearanceTypes.SECONDARY}
              onClick={() => deleteDataModelMutation.mutate(dataModel?.modelId)}
            >
              Cancel
            </Button>
            <Button appearance={ButtonAppearanceTypes.ERROR}>Delete</Button>
          </div>
        ),
      });
    } else {
      open({
        title: 'Are you sure?',
        content: (
          <p>Confirm that you are wish to delete the following data model</p>
        ),
        footer: (
          <div className="flex-grid">
            <Button
              appearance={ButtonAppearanceTypes.SECONDARY}
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteDataModelMutation.mutate(dataModel.modelId)}
              appearance={ButtonAppearanceTypes.ERROR}
            >
              Delete
            </Button>
          </div>
        ),
      });
    }
  };

  const deleteDataModelMutation = useMutation({
    mutationFn: (modelId: number) => deleteDataModel(modelId),
    onSuccess: async (response) => {
      close();
      navigate(0);
    },
    onError: () => {
      open({
        title: 'Error Deleting Data Model',
        content: (
          <p>
            There was an issue deleting the data model. Please try again. If the
            problem persists, contact support for assistance.
          </p>
        ),
      });
    },
  });

  const retrainDataModelMutation = useMutation({
    mutationFn: (modelId: number) => retrainDataModel(modelId),
    onSuccess: async () => {
      close();
      navigate(0);
    },
    onError: () => {
      open({
        title: 'Error Deleting Data Model',
        content: (
          <p>
            There was an issue retraining the data model. Please try again. If
            the problem persists, contact support for assistance.
          </p>
        ),
      });
    },
  });

  return (
    <div>
      <div className="container">
        <div className="flex-grid" style={{ margin: '30px 0px' }}>
          <Link to={''} onClick={() => navigate(0)}>
            <BackArrowButton />
          </Link>
          <div className="title">Configure Data Model</div>
        </div>

        <Card>
          <div
            style={{
              padding: '20px 150px',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div>
              <p>
                Model updated. Please initiate retraining to continue benefiting
                from the latest improvements.
              </p>
              <Button
                onClick={() => {
                  retrainDataModelMutation.mutate(dataModel.modelId);
                }}
              >
                Retrain
              </Button>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <CircularSpinner />
        ) : (
          <DataModelForm
            dataModel={dataModel}
            handleChange={handleDataModelAttributesChange}
            type="configure"
          />
        )}
      </div>
      <div
        className="flex"
        style={{
          alignItems: 'end',
          gap: '10px',
          justifyContent: 'end',
          margin: '25px -16px -16px',
          padding: '20px 64px',
          background: 'white',
        }}
      >
        <Button appearance="error" onClick={() => handleDelete()}>
          Delete Model
        </Button>
        <Button
          onClick={() =>
            open({
              title: 'Confirm Retrain Model',
              content: 'Are you sure you want to retrain this model?',
              footer: (
                <div className="flex-grid">
                  <Button
                    appearance={ButtonAppearanceTypes.SECONDARY}
                    onClick={close}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      retrainDataModelMutation.mutate(dataModel.modelId)
                    }
                  >
                    Retrain
                  </Button>
                </div>
              ),
            })
          }
        >
          Retrain
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
};

export default ConfigureDataModel;
