import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'components';
import { Link, useNavigate } from 'react-router-dom';
import './DataModels.scss';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDialog } from 'hooks/useDialog';
import BackArrowButton from 'assets/BackArrowButton';
import { extractedArray, validateDataModel } from 'utils/dataModelsUtils';
import DataModelForm from 'components/molecules/DataModelForm';
import { ButtonAppearanceTypes } from 'enums/commonEnums';
import { createDataModel, getDataModelsOverview } from 'services/data-models';
import { dataModelsQueryKeys, integrationQueryKeys } from 'utils/queryKeys';
import { getIntegrationStatus } from 'services/integration';
import { CreateDataModelPayload, DataModel } from 'types/dataModels';

const CreateDataModel: FC = () => {
  const { t } = useTranslation();
  const { open, close } = useDialog();
  const navigate = useNavigate();
  const [availableProdModels, setAvailableProdModels] = useState<string[]>([]);

  const [dataModel, setDataModel] = useState<Partial<DataModel>>({
    modelName: '',
    dgName: '',
    dgId: 0,
    platform: '',
    baseModels: [],
    maturity: '',
    version: 'V1.0',
  });

  useQuery(
    dataModelsQueryKeys.DATA_MODELS_OVERVIEW(
      0,
      'all',
      -1,
      -1,
      'all',
      -1,
      'all',
      'all',
      'asc',
      true
    ),
    () =>
      getDataModelsOverview(
        1,
        'all',
        -1,
        -1,
        'all',
        -1,
        'all',
        'all',
        'asc',
        true
      ),
    {
      onSuccess: (data) => {
        setAvailableProdModels(extractedArray(data?.data, 'deploymentEnv'));
      },
    }
  );

  const { data: integrationStatus } = useQuery(
    integrationQueryKeys.INTEGRATION_STATUS(),
    () => getIntegrationStatus()
  );

  const handleDataModelAttributesChange = (name: string, value: string) => {
    setDataModel((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  const [errors, setErrors] = useState({
    modelName: '',
    dgName: '',
    platform: '',
    baseModels: '',
    maturity: '',
  });

  const validateData = () => {
    const validationErrors = validateDataModel(dataModel);
    setErrors(validationErrors);
    return Object.keys(validationErrors)?.length === 0;
  };

  const handleCreate = () => {
    if (validateData()) {
      const payload = {
        modelName: dataModel.modelName,
        dgId: dataModel.dgId,
        baseModels: dataModel.baseModels,
        deploymentPlatform: dataModel.platform,
        maturityLabel: dataModel.maturity,
      };

      if (availableProdModels?.includes(dataModel.platform ?? '')) {
        open({
          title: t('dataModels.createDataModel.replaceTitle'),
          content: (
            <div>
              {t('dataModels.createDataModel.replaceDesc')}
              {!integrationStatus[
                `${dataModel.platform}_connection_status`
              ] && (
                <div className="warning">
                  {t('dataModels.createDataModel.replaceWarning', {
                    platform: dataModel.platform,
                  })}
                </div>
              )}
            </div>
          ),
          footer: (
            <div className="flex-grid">
              <Button
                appearance={ButtonAppearanceTypes.SECONDARY}
                onClick={close}
              >
                {t('global.cancel')}
              </Button>
              <Button onClick={() => createDataModelMutation.mutate(payload)}>
                {t('global.proceed')}
              </Button>
            </div>
          ),
        });
      } else {
        createDataModelMutation.mutate(payload);
      }
    }
  };
  const createDataModelMutation = useMutation({
    mutationFn: (data: CreateDataModelPayload) => createDataModel(data),
    onSuccess: async (response) => {
      open({
        title: t('dataModels.createDataModel.successTitle'),
        content: <p>{t('dataModels.createDataModel.successDesc')}</p>,
        footer: (
          <div className="flex-grid">
            <Button appearance={ButtonAppearanceTypes.SECONDARY}>
              {t('global.cancel')}
            </Button>{' '}
            <Button
              onClick={() => {
                navigate('/data-models');
                close();
              }}
            >
              {t('dataModels.createDataModel.viewAll')}
            </Button>
          </div>
        ),
      });
    },
    onError: () => {
      open({
        title: t('dataModels.createDataModel.errorTitle'),
        content: <p>{t('dataModels.createDataModel.errorDesc')}</p>,
      });
    },
  });

  return (
    <div>
      <div className="container">
        <div className="title_container">
          <div className="flex-grid">
            <Link to={'/data-models'}>
              <BackArrowButton />
            </Link>
            <div className="title">{t('dataModels.createDataModel.title')}</div>
          </div>
        </div>
        <DataModelForm
          errors={errors}
          dataModel={dataModel}
          handleChange={handleDataModelAttributesChange}
          type="create"
        />
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
        <Button onClick={() => handleCreate()}>
          {t('dataModels.createDataModel.title')}
        </Button>
        <Button appearance="secondary" onClick={() => navigate('/data-models')}>
          {t('global.cancel')}
        </Button>
      </div>
    </div>
  );
};

export default CreateDataModel;