import { Form, Input } from 'antd';
import React from 'react';
import HelpIcon from '../HelpIcon/HelpIcon';
import { CertificateForm } from '../../datastructure';
import './index.less';
import { getMessage } from '../../../resource/ProjectMgmtBundle';

type FormFieldKey = keyof CertificateForm;

type FormRowProps = {
  title: string;
  field: FormFieldKey;
  value: string;
  updateField: (key: FormFieldKey, value: string | number | undefined) => void;
  helpKey?: string;
  maxLength?: number;
};

const FormLabel = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <span className="form-label">{children}</span>
);

export const FormRow = ({ title, field, value, updateField, helpKey, maxLength }: FormRowProps): React.JSX.Element => {
  return (
    <div className="form-row">
      <Form.Item label={title} labelAlign="left" required>
        <Input
          className="form-input"
          value={value}
          maxLength={maxLength}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
            updateField(field, e.target.value);
          }}
        />

        {helpKey && <HelpIcon helpKey={helpKey} />}
      </Form.Item>
    </div>
  );
};