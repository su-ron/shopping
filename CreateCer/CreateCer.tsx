import React, { useState } from 'react';
import { Input, InputNumber, Button, Popover, message } from 'antd';
import { getMessage } from '../../../resource/ProjectMgmtBundle';
import helpDefault from '../../icon/help.png';
import fileChooser from '../../icon/filechooser.png';

import './index.less';

import { CefQueryCfg } from '../../cef/CefQueryCfg';
import { sendCefQuery } from '../../cef/CefQuery';
import { ImportCertificatePayload, ImportCertificateResult } from '../datastructure/ImportCertificateData';

type Props = {onNext: (cerFilePath: string) => void;onCancel: () => void;};

interface FormErrors {password?: string;confirmPassword?: string;}

const FormLabel = ({ required, children }: { required?: boolean; children: React.ReactNode }): React.JSX.Element => ({required && *}{children});

export const CreateCer = ({ onNext, onCancel }: Props): React.JSX.Element => {const helpImg = helpDefault;

const [form, setForm] = useState({p12Name: '',p12Path: '',password: '',confirmPassword: '',keyAlias: '',validity: 25,firstName: '',orgUnit: '',organization: '',city: '',province: '',countryCode: '',csrName: '',csrPath: '',});

const [errors, setErrors] = useState({});const [backendFieldErrors, setBackendFieldErrors] = useState({});const [loading, setLoading] = useState(false);const [advanceOpen, setAdvanceOpen] = useState(false);const dispatch = useAppDispatch();const [fieldFocus, setFieldFocus] = useState<Record<string, boolean>>({});const [validateErrors, setValidateErrors] = useState({});// 定义 errorMap 的类型type ErrorMap = Record<string, string[]>;

const passwordRule = createPasswordRule();

const handleFocus = (fieldName: string): void => {setFieldFocus(prev => ({ ...prev, [fieldName]: true }));};const handleBlur = (fieldName: string): void => {setFieldFocus(prev => ({ ...prev, [fieldName]: false }));};

// 根据主题替换图标const theme = useSearchParams('theme');const iconFolder = theme === 'dark' ? iconFolderDark : iconFolderLight;const iconHelp = theme === 'dark' ? iconHelpDark : iconHelpLight;

// ======================// 更新字段并清除对应错误// ======================const updateField = (key: keyof CertificateForm, value: string | number | undefined): void => {setForm(prev => ({ ...prev, [key]: value }));if (errors[key as keyof FormErrors]) {setErrors(prev => ({ ...prev, [key]: undefined }));}if (backendFieldErrors[key as keyof FormErrors]) {setBackendFieldErrors(prev => ({ ...prev, [key]: undefined }));}};

const handleSelectP12Path = (): void => {handleSelectFilePath('p12Path');};

const handleSelectCSRPath = (): void => {handleSelectFilePath('csrPath');};

const handleSelectFilePath = (field: 'p12Path' | 'csrPath'): void => {const queryCfg = new CefQueryCfg(EVENT_SELECT_FILE_PATH);

queryCfg.data = JSON.stringify({
  title: getMessage('uploadProduct.fileChooser.title'),
});

queryCfg.success = (data: string): void => {
  try {
    const result = JSON.parse(data);

    if (result.path) {
      updateField(field, result.path);
    }
  } catch (err) {
    console.error('CEF file path response parse error:', err, data);

    message.error('Failed to parse file path response');
  }
};

queryCfg.fail = (): void => {
  // 用户取消选择，无操作
};

sendCefQuery(queryCfg);

};

const validateForm = (): boolean => {const fields: (keyof FormErrors)[] = ['password', 'confirmPassword'];let isValid = true;

fields.forEach(field => {
  if (!validateField(field)) {
    isValid = false;
  }
});

return isValid;

};

const isFormValid = (): boolean => {const fields: (keyof FormErrors)[] = ['password', 'confirmPassword'];

return fields.every(field => !validators[field]?.());

};

// ======================// 单字段校验// ======================const validators: Record<keyof FormErrors, () => string | undefined> = {password: () => {const value = form.password;

  if (!value) {
    return getMessage('uploadProduct.createCer.error.passwordRequired');
  }

  const rules = [
    /[a-z]/,
    /[A-Z]/,
    /\d/,
    /[~!@#$%^&*()\-_=+|[\]{};:'",.<>/?`]/, // 特殊字符
  ];

  const matchCount = rules.filter(rule => rule.test(value)).length;

  if (matchCount < 2) {
    return getMessage('uploadProduct.createCer.error.passwordComplexity');
  }

  if (value.length < 8) {
    return getMessage('uploadProduct.createCer.error.length');
  }

  return undefined;
},

confirmPassword: () => {
  if (!form.confirmPassword) {
    return getMessage('uploadProduct.createCer.error.confirmPasswordRequired');
  }

  if (form.confirmPassword !== form.password) {
    return getMessage('uploadProduct.createCer.error.passwordMismatch');
  }

  return undefined;
},

};

const validateField = (field: keyof FormErrors): boolean => {const error = validators[field]?.();

setErrors(prev => ({
  ...prev,
  [field]: error,
}));

return !error;

};

// const handleBlur = (field: keyof FormErrors): void => {//   validateField(field);// };

// ======================// Next// ======================const handleNext = (): void => {if (!validateForm()) {return;}setLoading(true);

const payload: createCertificatePayload = {
  p12Name: form.p12Name,
  p12Path: form.p12Path,
  password: form.password,
  confirmPassword: form.confirmPassword,
  keyAlias: form.keyAlias,
  validity: form.validity ?? 25,
  firstName: form.firstName || form.keyAlias,
  orgUnit: form.orgUnit,
  organization: form.organization,
  city: form.city,
  province: form.province,
  countryCode: form.countryCode,
  csrName: form.csrName,
  csrPath: form.csrPath,
};

const queryCfg = new CefQueryCfg(EVENT_CREATE_CERTIFICATE);
queryCfg.data = JSON.stringify(payload);

// 成功回调
queryCfg.success = (data: string): void => {
  handleSuccessResponse(data);
};

// 失败回调
queryCfg.fail = (errorCode: number, errorMessage: string): void => {
  handleQueryFail(errorCode, errorMessage);
};

sendCefQuery(queryCfg);

};

// 成功响应处理const handleSuccessResponse = (data: string): void => {setLoading(false);

try {
  const response = JSON.parse(data);

  if (response.success) {
    const { certpath, storeFile, storePassword, keyPassword, alias } = JSON.parse(response.data);
    dispatch(
      changeMaterial({
        ...store.getState().uploadAppWizardState.material,
        certpath,
        storeFile,
        storePassword,
        keyPassword,
        keyAlias: alias,
      }),
    );
    onNext(certpath);
    return;
  }

  // 业务错误处理
  const msg = response.error;
  Modal.error({
    title: 'Error',
    content: msg,
    okText: getMessage('button.ok'),
  });
} catch (err) {
  console.error('handleSuccessResponse parse error:', {
    error: err,
    rawData: data,
  });

  message.error('Invalid response from server');
}

};

// CEF 查询失败处理const handleQueryFail = (errorCode: number, errorMessage: string): void => {setLoading(false);message.error(errorMessage || CEF error (code: ${errorCode}));};

// ======================// Cancel// ======================const handleCancel = (): void => {onCancel();};

// ======================// 展开/收起 Advance Setting// ======================const toggleAdvance = (): void => {setAdvanceOpen(prev => !prev);};
return (<div className={'signForm'}><FormautoComplete={'off'}labelCol={{ span: 6 }}wrapperCol={{ span: 18 }}onFieldsChange={(allFields): void => {const errorMsg: ErrorMap = {};allFields.forEach(field => {if (field.errors?.length) {const name = Array.isArray(field.name) ? field.name.join('.') : String(field.name);errorMsg[name] = field.errors;}});setValidateErrors(errorMsg);}}>{/* ================= FORM ================= /}{/ Key store name (*.p12) /}<Form.Item label={getMessage('uploadProduct.createCer.label.p12FileName')} labelAlign="left" required><div style={{ display: 'flex', alignItems: 'center' }}><Form.Itemname={'p12Name'}rules={[{ required: true, message: getMessage('signing.form.msg.text.box.empty') }]}noStyle><Input className={'fieldArea'} style={{ marginRight: '6px' }} disabled={false} /></Form.Item><Popover placement={'left'} trigger={'hover'} content={ToolTipMsg('p12Name')}><img src={iconHelp} className={'qco-icon img-logo'} />{fieldFocus.storeFile && validateErrors.storeFile && ({validateErrors.storeFile[0]})}</Form.Item>{/ Select file save path (p12) */}<Form.Item label={getMessage('uploadProduct.createCer.label.savePath')} labelAlign="left" required><div style={{ display: 'flex', alignItems: 'center' }}><Form.Item name={'p12Path'} noStyle><InputclassName={'fieldArea'}style={{ marginRight: '8px' }}value={form.p12Path}suffix={<img className={'img-logo'} src={iconFolder} style={{ opacity: 1 }} onClick={handleSelectP12Path} />}disabled={false}/></Form.Item>{getMessage('uploadProduct.createCer.label.fileWillBeCreatedIn')} {form.p12Path || ''}</Form.Item>

      {/* Key store password */}
      <Form.Item label={getMessage('signing.form.label.store.password')} labelAlign="left" required>
        <div
          style={{ display: 'flex', alignItems: 'center' }}
          onFocus={(): void => handleFocus('storePassword')}
          onBlur={(): void => handleBlur('storePassword')}
        >
          <Form.Item
            rules={[
              passwordRule,
              { required: true, message: getMessage('signing.form.msg.text.box.empty') },
              { min: 6, max: 64, message: getMessage('signing.form.msg.store.password.length') },
            ]}
            name={'storePassword'}
            noStyle
          >
            <Input className={'fieldArea'} disabled={false} type={'password'} />
          </Form.Item>
          {fieldFocus.storePassword && validateErrors.storePassword && (
            <span className="validate-error-message">{validateErrors.storePassword[0]}</span>
          )}
          <Popover placement={'left'} trigger={'hover'} content={ToolTipMsg('storePassword')}>
            <img src={iconHelp} className={'qco-icon img-logo'} />
          </Popover>
        </div>
      </Form.Item>
      {/* Confirm password */}
      <Form.Item label={getMessage('uploadProduct.createCer.label.confirmPassword')} labelAlign="left" required>
        <div
          style={{ display: 'flex', alignItems: 'center' }}
          onFocus={(): void => handleFocus('confirmPassword')}
          onBlur={(): void => handleBlur('confirmPassword')}
        >
          <Form.Item
            rules={[
              passwordRule,
              { required: true, message: getMessage('signing.form.msg.text.box.empty') },
              { min: 6, max: 64, message: getMessage('signing.form.msg.store.password.length') },
            ]}
            name={'confirmPassword'}
            noStyle
          >
            <Input className={'fieldArea'} disabled={false} type={'confirmPassword'} />
          </Form.Item>
          {fieldFocus.confirmPassword && validateErrors.confirmPassword && (
            <span className="validate-error-message">{validateErrors.sconfirmPassword[0]}</span>
          )}
          <Popover placement={'left'} trigger={'hover'} content={ToolTipMsg('confirmPassword')}>
            <img src={iconHelp} className={'qco-icon img-logo'} />
          </Popover>
        </div>
      </Form.Item>
      {/* ================= SEPARATOR ================= */}
      <div className="key-separator">
        <span className="key-separator-text">Key</span>
        <span className="key-separator-line" />
      </div>
      {/* Alias — 缩进3个字节 */}
      <Form.Item label={getMessage('uploadProduct.createCer.label.keyAlias')} labelAlign="left" required>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Form.Item name={'keyAlias'} noStyle>
            <Input className={'fieldArea'} style={{ marginRight: '6px' }} disabled={false} />
          </Form.Item>
          <Popover placement={'left'} trigger={'hover'} content={ToolTipMsg('keyAlias')}>
            <img src={iconHelp} className={'qco-icon img-logo'} />
          </Popover>
        </div>
      </Form.Item>
      {/* ================= ADVANCE SETTING ================= */}
      <div className="advance-setting">
        <div className="advance-header" onClick={toggleAdvance}>
          <span className={`advance-arrow ${advanceOpen ? 'open' : ''}`}>{advanceOpen ? '▼' : '▶'}</span>
          <span className="advance-title">{getMessage('uploadProduct.createCer.advanceSetting')}</span>
          <span className="advance-header-line" />
        </div>

        {advanceOpen && (
          <div className="advance-body">
            {/* Validity(years) — 短输入框，1/4宽度 */}
            <div className="form-row">
              <FormLabel>{getMessage('uploadProduct.createCer.label.validity')}</FormLabel>
              <div className="form-right">
                <InputNumber
                  className="form-input-number"
                  min={1}
                  max={100}
                  value={form.validity}
                  onChange={(value: number | null): void => updateField('validity', value ?? undefined)}
                />
              </div>
            </div>

            {/* First and last name */}
            <FormRow
              title={getMessage('uploadProduct.createCer.label.firstName')}
              field="firstName"
              value={form.firstName}
              updateField={updateField}
              helpKey="firstName"
            />

            {/* Organizational unit */}
            <FormRow
              title={getMessage('uploadProduct.createCer.label.orgUnit')}
              field="orgUnit"
              value={form.orgUnit}
              updateField={updateField}
              helpKey="orgUnit"
            />

            {/* Organization */}
            <FormRow
              title={getMessage('uploadProduct.createCer.label.organization')}
              field="organization"
              value={form.organization}
              updateField={updateField}
              helpKey="organization"
            />

            {/* City or locality */}
            <FormRow
              title={getMessage('uploadProduct.createCer.label.city')}
              field="city"
              value={form.city}
              updateField={updateField}
              helpKey="city"
            />

            {/* State or province */}
            <FormRow
              title={getMessage('uploadProduct.createCer.label.province')}
              field="province"
              value={form.province}
              updateField={updateField}
              helpKey="province"
            />

            {/* Country code(XX) */}
            <FormRow
              title={getMessage('uploadProduct.createCer.label.countryCode')}
              field="countryCode"
              value={form.countryCode}
              updateField={updateField}
              helpKey="countryCode"
              maxLength={2}
            />
          </div>
        )}
      </div>
      {/* CSR file (*.csr) — 不属于展开部分 */}
      <Form.Item label={getMessage('uploadProduct.createCer.label.csrFile')} labelAlign="left" required>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Form.Item noStyle>
            <Input
              className={'fieldArea'}
              style={{ marginRight: '6px' }}
              value={form.csrName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => updateField('csrName', e.target.value)}
            />
          </Form.Item>
          <Popover placement={'left'} trigger={'hover'} content={ToolTipMsg('csrFile')}>
            <img src={iconHelp} className={'qco-icon img-logo'} />
          </Popover>
        </div>
      </Form.Item>
      {/* Select file save path (CSR) */}
      <Form.Item label={getMessage('uploadProduct.createCer.label.csrSavePath')} labelAlign="left" required>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Form.Item noStyle>
            <Input
              className={'fieldArea'}
              style={{ marginRight: '6px' }}
              value={form.csrPath}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => updateField('csrPath', e.target.value)}
              suffix={
                <img
                  className={'img-logo'}
                  src={iconFolder}
                  style={{ opacity: 1 }}
                  onClick={handleSelectCSRPath}
                  alt="choose csr file"
                />
              }
              disabled={false}
            />
          </Form.Item>
          <Popover placement={'left'} trigger={'hover'} content={ToolTipMsg('keyStoreName')}>
            <img src={iconHelp} className={'qco-icon img-logo'} />
          </Popover>
        </div>
        <div className="path-hint">
          {getMessage('uploadProduct.createCer.label.fileWillBeCreatedIn')} {form.csrPath || ''}
        </div>
      </Form.Item>