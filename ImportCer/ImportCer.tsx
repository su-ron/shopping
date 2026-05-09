import React, { useState } from 'react';
import { Input, InputNumber, Button, Popover, message } from 'antd';
import { getMessage } from '../../../resource/ProjectMgmtBundle';
import helpDefault from '../../icon/help.png';
import fileChooser from '../../icon/filechooser.png';

import './index.less';

import { CefQueryCfg } from '../../../../cef/CefQueryCfg';
import { sendCefQuery } from '../../../../cef/CefQuery';
import { ImportCertificatePayload, ImportCertificateResult } from '../datastructure/ImportCertificateData';

type Props = {
  onNext: () => void;
  onCancel: () => void;
};

interface CertificateForm {
  p12Name: string;
  p12Path: string;
  password: string;
  confirmPassword: string;
  keyAlias: string;
  validity: number | undefined;
  firstName: string;
  orgUnit: string;
  organization: string;
  city: string;
  province: string;
  countryCode: string;
  CSRName: string;
  csrPath: string;
}

interface FormErrors {
  p12Name?: string;
  p12Path?: string;
  password?: string;
  confirmPassword?: string;
  keyAlias?: string;
  validity?: string;
  firstName?: string;
  orgUnit?: string;
  organization?: string;
  city?: string;
  province?: string;
  countryCode?: string;
  CSRName?: string;
  csrPath?: string;
}

const HELP_CONTENT: Record<string, { title: string; content: string }> = {
  p12Name: {
    title: getMessage('uploadProduct.importCer.help.p12Name.title'),
    content: getMessage('uploadProduct.importCer.help.p12Name.content'),
  },
  keyAlias: {
    title: getMessage('uploadProduct.importCer.help.keyAlias.title'),
    content: getMessage('uploadProduct.importCer.help.keyAlias.content'),
  },
  csrFile: {
    title: getMessage('uploadProduct.importCer.help.csrFile.title'),
    content: getMessage('uploadProduct.importCer.help.csrFile.content'),
  },
  firstName: {
    title: getMessage('uploadProduct.importCer.help.firstName.title'),
    content: getMessage('uploadProduct.importCer.help.firstName.content'),
  },
  orgUnit: {
    title: getMessage('uploadProduct.importCer.help.orgUnit.title'),
    content: getMessage('uploadProduct.importCer.help.orgUnit.content'),
  },
  organization: {
    title: getMessage('uploadProduct.importCer.help.organization.title'),
    content: getMessage('uploadProduct.importCer.help.organization.content'),
  },
  city: {
    title: getMessage('uploadProduct.importCer.help.city.title'),
    content: getMessage('uploadProduct.importCer.help.city.content'),
  },
  province: {
    title: getMessage('uploadProduct.importCer.help.province.title'),
    content: getMessage('uploadProduct.importCer.help.province.content'),
  },
};

// IntelliJ 风格错误气泡 — 包裹输入框，在输入框上方显示错误
const IntelliJFieldWrapper = ({ error, children }: { error?: string; children: React.ReactNode }) => {
  return (
    <div className="intellij-field-wrapper">
      {error && <div className="intellij-error-bubble">{error}</div>}
      {children}
    </div>
  );
};

const FormLabel = ({ required, children }: { required?: boolean; children: React.ReactNode }) => (
  <span className="form-label">
    {required && <span className="required-star">*</span>}
    {children}
  </span>
);

const HelpIcon = ({ helpKey }: { helpKey: string }) => {
  const help = HELP_CONTENT[helpKey];
  return (
    <span className={`help-icon-wrapper ${!help ? 'help-icon-placeholder' : ''}`}>
      {help && (
        <Popover
          title={help.title}
          content={help.content}
          trigger="hover"
          placement="bottomRight"
        >
          <img src={helpDefault} className="help-icon" alt="help" />
        </Popover>
      )}
    </span>
  );
};

export const ImportCer = ({ onNext, onCancel }: Props): React.JSX.Element => {

  const [form, setForm] = useState<CertificateForm>({
    p12Name: '',
    p12Path: '',
    password: '',
    confirmPassword: '',
    keyAlias: '',
    validity: 25,
    firstName: '',
    orgUnit: '',
    organization: '',
    city: '',
    province: '',
    countryCode: '',
    CSRName: '',
    csrPath: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [backendFieldErrors, setBackendFieldErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);

  // ======================
  // 更新字段并清除对应错误
  // ======================
  const updateField = (key: keyof CertificateForm, value: string | number | undefined): void => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
    if (backendFieldErrors[key as keyof FormErrors]) {
      setBackendFieldErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  // ======================
  // 后端错误消息 → 字段映射
  // ======================
  const matchErrorToField = (message: string): keyof FormErrors | null => {
    const m = message.toLowerCase();
    if (m.includes('p12name') || (m.includes('key store') && m.includes('name'))) return 'p12Name';
    if (m.includes('p12path') || (m.includes('p12') && m.includes('path'))) return 'p12Path';
    if (m.includes('password')) return 'password';
    if (m.includes('confirm')) return 'confirmPassword';
    if (m.includes('alias') || m.includes('keyalias')) return 'keyAlias';
    if (m.includes('validity')) return 'validity';
    if (m.includes('firstname') || (m.includes('first') && m.includes('name'))) return 'firstName';
    if (m.includes('orgunit') || (m.includes('organi') && m.includes('unit'))) return 'orgUnit';
    if (m.includes('organization')) return 'organization';
    if (m.includes('city') || m.includes('locality')) return 'city';
    if (m.includes('province') || m.includes('state')) return 'province';
    if (m.includes('countrycode') || m.includes('country code')) return 'countryCode';
    if (m.includes('csrname') || (m.includes('csr') && m.includes('name'))) return 'CSRName';
    if (m.includes('csrpath') || (m.includes('csr') && m.includes('path'))) return 'csrPath';
    return null;
  };

  // ======================
  // 文件选择 — 通过 CEF 后端打开 IntelliJ 原生文件选择器
  // ======================
  const handleSelectP12Path = (): void => {
    const queryCfg = new CefQueryCfg('SelectFilePath');
    queryCfg.data = JSON.stringify({ extensions: ['.p12'], title: 'Select .p12 file' });
    queryCfg.success = (data: string): void => {
      try {
        const result = JSON.parse(data);
        if (result.path) {
          updateField('p12Path', result.path);
        }
      } catch {
        message.error('Failed to parse file path response');
      }
    };
    queryCfg.failure = (): void => {
      // 用户取消选择，无操作
    };
    sendCefQuery(queryCfg);
  };

  const handleSelectCSRPath = (): void => {
    const queryCfg = new CefQueryCfg('SelectFilePath');
    queryCfg.data = JSON.stringify({ extensions: ['.csr'], title: 'Select .csr file' });
    queryCfg.success = (data: string): void => {
      try {
        const result = JSON.parse(data);
        if (result.path) {
          updateField('csrPath', result.path);
        }
      } catch {
        message.error('Failed to parse file path response');
      }
    };
    queryCfg.failure = (): void => {
      // 用户取消选择，无操作
    };
    sendCefQuery(queryCfg);
  };

  // ======================
  // 单字段校验
  // ======================
  const validateField = (field: keyof FormErrors): boolean => {
    let error: string | undefined;

    switch (field) {
      case 'p12Name': {
        const value = form.p12Name;
        if (!value) {
          error = getMessage('uploadProduct.importCer.error.p12NameRequired');
        } else if (!/^[a-zA-Z0-9_.-]+\.p12$/.test(value)) {
          error = getMessage('uploadProduct.importCer.error.p12NameFormat');
        }
        break;
      }
      case 'p12Path':
        if (!form.p12Path) {
          error = getMessage('uploadProduct.importCer.error.p12PathRequired');
        }
        break;
      case 'password': {
        const value = form.password;
        if (!value) {
          error = getMessage('uploadProduct.importCer.error.passwordRequired');
        } else if (value.length < 6) {
          error = getMessage('uploadProduct.importCer.error.passwordMinLength');
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[~!@#$%^&*()\-_=+|[\]{};:'",.<>/?`])/.test(value)) {
          error = getMessage('uploadProduct.importCer.error.passwordComplexity');
        }
        break;
      }
      case 'confirmPassword': {
        if (!form.confirmPassword) {
          error = getMessage('uploadProduct.importCer.error.confirmPasswordRequired');
        } else if (form.confirmPassword !== form.password) {
          error = getMessage('uploadProduct.importCer.error.passwordMismatch');
        }
        break;
      }
      case 'keyAlias': {
        const value = form.keyAlias;
        if (!value) {
          error = getMessage('uploadProduct.importCer.error.keyAliasRequired');
        } else if (/\s/.test(value)) {
          error = getMessage('uploadProduct.importCer.error.keyAliasNoSpace');
        }
        break;
      }
      case 'validity': {
        if (form.validity === undefined || form.validity === null) {
          error = getMessage('uploadProduct.importCer.error.validityRequired');
        } else if (!Number.isInteger(form.validity) || form.validity <= 0) {
          error = getMessage('uploadProduct.importCer.error.validityFormat');
        }
        break;
      }
      // 高级设置字段不强制填写，跳过校验
      case 'firstName':
      case 'orgUnit':
      case 'organization':
      case 'city':
      case 'province':
      case 'countryCode':
        break;
      case 'CSRName':
        if (!form.CSRName) {
          error = getMessage('uploadProduct.importCer.error.csrNameRequired');
        }
        break;
      case 'csrPath':
        if (!form.csrPath) {
          error = getMessage('uploadProduct.importCer.error.csrPathRequired');
        }
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleBlur = (field: keyof FormErrors): void => {
    validateField(field);
  };

  // ======================
  // 校验全部字段
  // ======================
  const validateForm = (): boolean => {
    const fields: (keyof FormErrors)[] = [
      'p12Name', 'p12Path', 'password', 'confirmPassword',
      'keyAlias', 'validity',
      'CSRName', 'csrPath',
    ];
    let isValid = true;

    fields.forEach(field => {
      if (!validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  };

  // ======================
  // Next
  // ======================
  const handleNext = (): void => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    // 构造请求 payload（不包含 confirmPassword，此为前端校验字段）
    // 高级设置字段非必填，firstName 为空时取 alias 值
    const payload: ImportCertificatePayload = {
      p12Name: form.p12Name,
      p12Path: form.p12Path,
      password: form.password,
      keyAlias: form.keyAlias,
      validity: form.validity!,
      firstName: form.firstName || form.keyAlias,
      orgUnit: form.orgUnit,
      organization: form.organization,
      city: form.city,
      province: form.province,
      countryCode: form.countryCode,
      CSRName: form.CSRName,
      csrPath: form.csrPath,
    };

    // 构造 CEF Query
    const queryCfg = new CefQueryCfg('ImportCertificate');
    queryCfg.data = JSON.stringify(payload);

    queryCfg.success = (data: string): void => {
      setLoading(false);
      try {
        const response = JSON.parse(data);
        if (response.success) {
          onNext();
        } else {
          // 业务错误 → 映射到字段并在输入框上方显示 IntelliJ 风格错误气泡
          const msg = response.error?.message || 'Import failed';
          const field = matchErrorToField(msg);
          if (field) {
            setBackendFieldErrors(prev => ({ ...prev, [field]: msg }));
          } else {
            message.error(msg);
          }
        }
      } catch {
        message.error('Invalid response from server');
      }
    };

    queryCfg.failure = (errorCode: number, errorMessage: string): void => {
      setLoading(false);
      message.error(errorMessage || `CEF error (code: ${errorCode})`);
    };

    sendCefQuery(queryCfg);
  };

  // ======================
  // Cancel
  // ======================
  const handleCancel = (): void => {
    onCancel();
  };

  // ======================
  // 展开/收起 Advance Setting
  // ======================
  const toggleAdvance = (): void => {
    setAdvanceOpen(prev => !prev);
  };

  return (
    <div className="import-cer-container">
      {/* ================= TITLE ================= */}
      <div className="import-cer-title-wrapper">
        <span className="import-cer-title">{getMessage('uploadProduct.importCer.title')}</span>
        <span className="title-line" />
      </div>

      {/* ================= FORM ================= */}
      <div className="form-section">
        {/* Key store name (*.p12) */}
        <div className="form-row">
          <FormLabel required>{getMessage('uploadProduct.importCer.label.p12FileName')}</FormLabel>
          <div className="form-right">
            <div className="form-line">
              <IntelliJFieldWrapper error={errors.p12Name || backendFieldErrors.p12Name}>
                <Input
                  className="form-input"
                  value={form.p12Name}
                  onChange={e => updateField('p12Name', e.target.value)}
                  onBlur={() => handleBlur('p12Name')}
                  status={errors.p12Name ? 'error' : undefined}
                />
              </IntelliJFieldWrapper>
              <HelpIcon helpKey="p12Name" />
            </div>
          </div>
        </div>

        {/* Select file save path (p12) */}
        <div className="form-row">
          <FormLabel required>{getMessage('uploadProduct.importCer.label.savePath')}</FormLabel>
          <div className="form-right">
            <div className="file-input-wrapper">
              <div className="form-line">
                <IntelliJFieldWrapper error={errors.p12Path || backendFieldErrors.p12Path}>
                  <div className="input-icon-wrapper">
                    <input
                      type="text"
                      className="form-path-input"
                      value={form.p12Path}
                      onChange={e => updateField('p12Path', e.target.value)}
                      onBlur={() => handleBlur('p12Path')}
                      placeholder=""
                    />
                    <img
                    src={fileChooser}
                    className="file-icon"
                    onClick={handleSelectP12Path}
                    alt="choose p12 file"
                  />
                </div>
                </IntelliJFieldWrapper>
                <HelpIcon helpKey="__none__" />
              </div>
              <div className="path-hint">
                {getMessage('uploadProduct.importCer.label.fileWillBeCreatedIn')}: {form.p12Path || ''}
              </div>
            </div>
          </div>
        </div>

        {/* Key store password */}
        <div className="form-row">
          <FormLabel required>{getMessage('uploadProduct.importCer.label.keyStorePassword')}</FormLabel>
          <div className="form-right">
            <div className="form-line">
              <IntelliJFieldWrapper error={errors.password || backendFieldErrors.password}>
                <Input.Password
                  className="form-input"
                  value={form.password}
                  onChange={e => updateField('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  status={errors.password ? 'error' : undefined}
                  iconRender={() => null}
                />
              </IntelliJFieldWrapper>
              <HelpIcon helpKey="__none__" />
            </div>
          </div>
        </div>

        {/* Confirm password */}
        <div className="form-row">
          <FormLabel required>{getMessage('uploadProduct.importCer.label.confirmPassword')}</FormLabel>
          <div className="form-right">
            <div className="form-line">
              <IntelliJFieldWrapper error={errors.confirmPassword || backendFieldErrors.confirmPassword}>
                <Input.Password
                  className="form-input"
                  value={form.confirmPassword}
                  onChange={e => updateField('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  status={errors.confirmPassword ? 'error' : undefined}
                  iconRender={() => null}
                />
              </IntelliJFieldWrapper>
              <HelpIcon helpKey="__none__" />
            </div>
          </div>
        </div>

        {/* ================= SEPARATOR ================= */}
        <div className="key-separator">
          <span className="key-separator-text">Key</span>
          <span className="key-separator-line" />
        </div>

        {/* Alias — 缩进3个字节 */}
        <div className="form-row indent-3">
          <FormLabel required>{getMessage('uploadProduct.importCer.label.keyAlias')}</FormLabel>
          <div className="form-right">
            <div className="file-input-wrapper">
              <div className="form-line">
                <IntelliJFieldWrapper error={errors.keyAlias || backendFieldErrors.keyAlias}>
                  <div className="input-icon-wrapper">
                    <Input
                      className="form-input"
                      value={form.keyAlias}
                      onChange={e => updateField('keyAlias', e.target.value)}
                      onBlur={() => handleBlur('keyAlias')}
                      status={errors.keyAlias ? 'error' : undefined}
                    />
                    <img
                      src={fileChooser}
                      className="file-icon"
                      onClick={handleSelectP12Path}
                      alt="choose p12 file"
                    />
                  </div>
                </IntelliJFieldWrapper>
                <HelpIcon helpKey="keyAlias" />
              </div>
            </div>
          </div>
        </div>

        {/* ================= ADVANCE SETTING ================= */}
        <div className="advance-setting">
          <div className="advance-header" onClick={toggleAdvance}>
            <span className={`advance-arrow ${advanceOpen ? 'open' : ''}`}>{advanceOpen ? '▼' : '▶'}</span>
            <span className="advance-title">{getMessage('uploadProduct.importCer.advanceSetting')}</span>
            <span className="advance-header-line" />
          </div>

          {advanceOpen && (
            <div className="advance-body">
              {/* Validity(years) — 短输入框，1/4宽度 */}
              <div className="form-row">
                <FormLabel required>{getMessage('uploadProduct.importCer.label.validity')}</FormLabel>
                <div className="form-right">
                  <IntelliJFieldWrapper error={errors.validity || backendFieldErrors.validity}>
                    <InputNumber
                      className="form-input-number"
                      min={1}
                      max={100}
                      value={form.validity}
                      onChange={value => updateField('validity', value ?? undefined)}
                      onBlur={() => handleBlur('validity')}
                      status={errors.validity ? 'error' : undefined}
                    />
                  </IntelliJFieldWrapper>
                </div>
              </div>

              {/* First and last name */}
              <div className="form-row">
                <FormLabel>{getMessage('uploadProduct.importCer.label.firstName')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <IntelliJFieldWrapper error={errors.firstName || backendFieldErrors.firstName}>
                      <Input
                        className="form-input"
                        value={form.firstName}
                        onChange={e => updateField('firstName', e.target.value)}
                        onBlur={() => handleBlur('firstName')}
                        status={errors.firstName ? 'error' : undefined}
                      />
                    </IntelliJFieldWrapper>
                    <HelpIcon helpKey="firstName" />
                  </div>
                </div>
              </div>

              {/* Organizational unit */}
              <div className="form-row">
                <FormLabel>{getMessage('uploadProduct.importCer.label.orgUnit')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <IntelliJFieldWrapper error={errors.orgUnit || backendFieldErrors.orgUnit}>
                      <Input
                        className="form-input"
                        value={form.orgUnit}
                        onChange={e => updateField('orgUnit', e.target.value)}
                        onBlur={() => handleBlur('orgUnit')}
                        status={errors.orgUnit ? 'error' : undefined}
                      />
                    </IntelliJFieldWrapper>
                    <HelpIcon helpKey="orgUnit" />
                  </div>
                </div>
              </div>

              {/* Organization */}
              <div className="form-row">
                <FormLabel>{getMessage('uploadProduct.importCer.label.organization')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <IntelliJFieldWrapper error={errors.organization || backendFieldErrors.organization}>
                      <Input
                        className="form-input"
                        value={form.organization}
                        onChange={e => updateField('organization', e.target.value)}
                        onBlur={() => handleBlur('organization')}
                        status={errors.organization ? 'error' : undefined}
                      />
                    </IntelliJFieldWrapper>
                    <HelpIcon helpKey="organization" />
                  </div>
                </div>
              </div>

              {/* City or locality */}
              <div className="form-row">
                <FormLabel>{getMessage('uploadProduct.importCer.label.city')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <IntelliJFieldWrapper error={errors.city || backendFieldErrors.city}>
                      <Input
                        className="form-input"
                        value={form.city}
                        onChange={e => updateField('city', e.target.value)}
                        onBlur={() => handleBlur('city')}
                        status={errors.city ? 'error' : undefined}
                      />
                    </IntelliJFieldWrapper>
                    <HelpIcon helpKey="city" />
                  </div>
                </div>
              </div>

              {/* State or province */}
              <div className="form-row">
                <FormLabel>{getMessage('uploadProduct.importCer.label.province')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <IntelliJFieldWrapper error={errors.province || backendFieldErrors.province}>
                      <Input
                        className="form-input"
                        value={form.province}
                        onChange={e => updateField('province', e.target.value)}
                        onBlur={() => handleBlur('province')}
                        status={errors.province ? 'error' : undefined}
                      />
                    </IntelliJFieldWrapper>
                    <HelpIcon helpKey="province" />
                  </div>
                </div>
              </div>

              {/* Country code(XX) */}
              <div className="form-row">
                <FormLabel>{getMessage('uploadProduct.importCer.label.countryCode')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <IntelliJFieldWrapper error={errors.countryCode || backendFieldErrors.countryCode}>
                      <Input
                        className="form-input"
                        value={form.countryCode}
                        onChange={e => updateField('countryCode', e.target.value)}
                        onBlur={() => handleBlur('countryCode')}
                        status={errors.countryCode ? 'error' : undefined}
                        maxLength={2}
                      />
                    </IntelliJFieldWrapper>
                    <HelpIcon helpKey="__none__" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CSR file (*.csr) — 不属于展开部分 */}
        <div className="form-row">
          <FormLabel required>{getMessage('uploadProduct.importCer.label.csrFile')}</FormLabel>
          <div className="form-right">
            <div className="form-line">
              <IntelliJFieldWrapper error={errors.CSRName || backendFieldErrors.CSRName}>
                <Input
                  className="form-input"
                  value={form.CSRName}
                  onChange={e => updateField('CSRName', e.target.value)}
                  onBlur={() => handleBlur('CSRName')}
                  status={errors.CSRName ? 'error' : undefined}
                />
              </IntelliJFieldWrapper>
              <HelpIcon helpKey="csrFile" />
            </div>
          </div>
        </div>

        {/* Select file save path (CSR) */}
        <div className="form-row">
          <FormLabel required>{getMessage('uploadProduct.importCer.label.csrSavePath')}</FormLabel>
          <div className="form-right">
            <div className="file-input-wrapper">
              <div className="form-line">
                <IntelliJFieldWrapper error={errors.csrPath || backendFieldErrors.csrPath}>
                  <div className="input-icon-wrapper">
                    <input
                      type="text"
                      className="form-path-input"
                      value={form.csrPath}
                      onChange={e => updateField('csrPath', e.target.value)}
                      onBlur={() => handleBlur('csrPath')}
                      placeholder=""
                    />
                    <img
                      src={fileChooser}
                      className="file-icon"
                      onClick={handleSelectCSRPath}
                      alt="choose csr file"
                    />
                  </div>
                </IntelliJFieldWrapper>
                <HelpIcon helpKey="__none__" />
              </div>
              <div className="path-hint">
                {getMessage('uploadProduct.importCer.label.fileWillBeCreatedIn')}: {form.csrPath || ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="footer-section">
        <div className="help-tooltip">
          <Popover
            title={getMessage('uploadProduct.importCer.help.title')}
            content={getMessage('uploadProduct.importCer.help.content')}
            trigger="hover"
            placement="bottomRight"
          >
            <span className="help-icon">
              <img className="help-img" src={helpDefault} alt="help" />
            </span>
          </Popover>
        </div>

        <div className="button-group">
          <Button onClick={handleCancel}>{getMessage('uploadProduct.importCer.button.cancel')}</Button>
          <Button type="primary" loading={loading} onClick={handleNext}>
            {getMessage('uploadProduct.importCer.button.next')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportCer;
