import React, { useState } from 'react';
import { Modal, Button, Popover } from 'antd';
import { CreateCer } from './CreateCer';
import helpDefault from '../../icon/help.png';
import { CefQueryCfg } from '../../cef/CefQueryCfg';
import { sendCefQuery } from '../../cef/CefQuery';
import { getMessage } from '../../../resource/ProjectMgmtBundle';

type Props = {
  open: boolean;
  setOpen: (value: boolean) => void;
  onConfirm: (cerFilePath: string) => void;
};

export const CreateCerModal = ({ open, setOpen, onConfirm }: Props): React.JSX.Element => {
  const [loading, setLoading] = useState(false);
  const [hasFormError, setHasFormError] = useState(false);
  const helpImg = helpDefault;

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
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="help-tooltip">
            <Popover
              title={getMessage('uploadProduct.createCer.help.title')}
              content={getMessage('uploadProduct.createCer.help.content')}
              trigger="hover"
              placement="bottomRight"
            >
              <span
                className="help-icon"
                onClick={(): void => {
                  sendCefQuery(new CefQueryCfg(EVENT_PUBLISH_APP_HELP));
                }}
              >
                <img className="help-img" src={helpImg} alt="help" />
              </span>
            </Popover>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button ghost onClick={(): void => setOpen(false)} className={'btn-common'}>
              {getMessage('uploadProduct.createCer.button.cancel')}
            </Button>
            <Button type="primary" loading={loading} disabled={hasFormError} htmlType="submit" form="cer-form" className={'btn-common'}>
              {getMessage('uploadProduct.createCer.button.next')}
            </Button>
          </div>
        </div>
      }
      className="create-cer-modal"
    >
      <CreateCer onNext={handleNext} onCancel={(): void => setOpen(false)} setLoading={setLoading} onFormErrorChange={setHasFormError} />
    </Modal>
  );
};
