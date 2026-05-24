import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { CreateCer } from './CreateCer';
import { getMessage } from '../../../resource/ProjectMgmtBundle';

type Props = {
  open: boolean;
  setOpen: (value: boolean) => void;
  onConfirm: (cerFilePath: string) => void;
};

export const CreateCerModal = ({ open, setOpen, onConfirm }: Props): React.JSX.Element => {
  const [loading, setLoading] = useState(false);
  const [hasFormError, setHasFormError] = useState(false);

  const handleNext = (cerFilePath: string): void => {
    onConfirm(cerFilePath);
    setOpen(false);
  };

  return (
    <Modal
      width={720}
      style={{ top: 0 }}
      styles={{
        body: {
          flex: 1,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      getContainer={false}
      destroyOnClose
      maskClosable={false}
      open={open}
      keyboard={false}
      closable={false}
      footer={[
        <Button
          key="cancel"
          ghost
          onClick={(): void => {
            setOpen(false);
          }}
          className={'btn-common'}
        >
          {getMessage('uploadProduct.createCer.button.cancel')}
        </Button>,
        <Button
          key="next"
          type="primary"
          loading={loading}
          disabled={hasFormError}
          htmlType="submit"
          form="cer-form"
          className={'btn-common'}
        >
          {getMessage('uploadProduct.createCer.button.next')}
        </Button>,
      ]}
      className="create-cer-modal"
    >
      <CreateCer onNext={handleNext} onCancel={(): void => setOpen(false)} setLoading={setLoading} onFormErrorChange={setHasFormError} />
    </Modal>
  );
};
