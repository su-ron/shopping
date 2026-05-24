import { Form, Input } from 'antd';
import React from 'react';
import HelpIcon from '../HelpIcon/HelpIcon';
import './index.less';

type FormRowProps = {
  title: string;
  name: string;
  helpKey?: string;
  maxLength?: number;
};

export const FormRow = ({ title, name, helpKey, maxLength }: FormRowProps): React.JSX.Element => {
  return (
    <div className="form-row">
      <span className="form-label">{title}</span>
      <div className="form-right">
        <div className="form-line">
          <Form.Item name={name} noStyle>
            <Input className="form-input" maxLength={maxLength} />
          </Form.Item>
          {helpKey && <HelpIcon helpKey={helpKey} />}
        </div>
      </div>
    </div>
  );
};
