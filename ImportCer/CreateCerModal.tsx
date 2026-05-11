import React from 'react';
import { Modal } from 'antd';
import { CreateCer } from './CreateCer';
import ImportCer from './ImportCer';

type Props = {
  open: boolean;
  setOpen: (value: boolean) => void;
  onConfirm: (cerFilePath: string) => void;
};

export const CreateCerModal = ({ open, setOpen, onConfirm }: Props): React.JSX.Element => {
  const handleNext = (cerFilePath: string): void => {
    onConfirm(cerFilePath);
    setOpen(false);
  };

  const handleCancel = (): void => {
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
      footer={null}
      className="create-cer-modal"
    >
      <ImportCer onNext={handleNext} onCancel={handleCancel} />
    </Modal>
  );
};
