import React, { useState, useRef } from 'react';
import { Input, Button, Popover, message } from 'antd';
import { getMessage } from '../../../resource/ProjectMgmtBundle';
import helpDefault from '../../icon/help.png';
import fileChooser from '../../icon/filechooser.png';

import './index.less';

import { CefQueryCfg } from '../../../../cef/CefQueryCfg';
import { sendCefQuery } from '../../../../cef/CefQuery';

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
  CSRName: string;
  csrPath: string;
}

interface FormErrors {
  p12Name?: string;
  p12Path?: string;
  password?: string;
  confirmPassword?: string;
  keyAlias?: string;
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
};

export const ImportCer = ({ onNext, onCancel }: Props): React.JSX.Element => {
  const helpImg = helpDefault;
  const fileChooserImg = fileChooser;
  const p12FileRef = useRef<HTMLInputElement | null>(null);
  const csrFileRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<CertificateForm>({
    p12Name: '',
    p12Path: '',
    password: '',
    confirmPassword: '',
    keyAlias: '',
    CSRName: '',
    csrPath: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);

  // ======================
  // 更新字段并清除对应错误
  // ======================
  const updateField = (key: keyof CertificateForm, value: string): void => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  // ======================
  // 文件选择（p12）
  // ======================
  const handleSelectP12 = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.p12')) {
      message.error(getMessage('uploadProduct.importCer.error.p12Format'));
      return;
    }

    updateField('p12Path', file.name);
  };

  // ======================
  // 文件选择（CSR）
  // ======================
  const handleSelectCSR = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csr')) {
      message.error(getMessage('uploadProduct.importCer.error.csrFormat'));
      return;
    }

    updateField('csrPath', file.name);
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
        } else if (!/^[a-zA-Z0-9_-]+\.p12$/.test(value)) {
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
      'keyAlias', 'CSRName', 'csrPath',
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
    // TODO: trigger CEF request
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

  const FormLabel = ({ required, children }: { required?: boolean; children: React.ReactNode }) => (
    <span className="form-label">
      {required && <span className="required-star">*</span>}
      {children}
    </span>
  );

  const HelpIcon = ({ helpKey }: { helpKey: string }) => {
    const help = HELP_CONTENT[helpKey];
    if (!help) return null;
    return (
      <Popover
        title={help.title}
        content={help.content}
        trigger="hover"
        placement="right"
      >
        <img src={helpImg} className="help-icon" alt="help" />
      </Popover>
    );
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
              <Input
                className="form-input"
                value={form.p12Name}
                onChange={e => updateField('p12Name', e.target.value)}
                onBlur={() => handleBlur('p12Name')}
                status={errors.p12Name ? 'error' : undefined}
              />
              <HelpIcon helpKey="p12Name" />
            </div>
            {errors.p12Name && <div className="field-error">{errors.p12Name}</div>}
          </div>
        </div>

        {/* Select file save path (p12) */}
        <div className="form-row">
          <FormLabel required>{getMessage('uploadProduct.importCer.label.savePath')}</FormLabel>
          <div className="form-right">
            <div className="file-input-wrapper">
              <div className="form-line">
                <input
                  type="text"
                  className="form-path-input"
                  value={form.p12Path}
                  onChange={e => updateField('p12Path', e.target.value)}
                  onBlur={() => handleBlur('p12Path')}
                  placeholder=""
                />
                <img
                  src={fileChooserImg}
                  className="file-icon"
                  onClick={() => p12FileRef.current?.click()}
                  alt="choose file"
                />
              </div>
              <div className="path-hint">
                {getMessage('uploadProduct.importCer.label.fileWillBeCreatedIn')}: {form.p12Path || ''}
              </div>
            </div>
            <input
              ref={p12FileRef}
              type="file"
              accept=".p12"
              style={{ display: 'none' }}
              onChange={handleSelectP12}
            />
            {errors.p12Path && <div className="field-error">{errors.p12Path}</div>}
          </div>
        </div>

        {/* Key store password */}
        <div className="form-row">
          <FormLabel required>{getMessage('uploadProduct.importCer.label.keyStorePassword')}</FormLabel>
          <div className="form-right">
            <Input.Password
              className="form-input"
              value={form.password}
              onChange={e => updateField('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              status={errors.password ? 'error' : undefined}
              iconRender={() => null}
            />
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>
        </div>

        {/* Confirm password */}
        <div className="form-row">
          <FormLabel required>{getMessage('uploadProduct.importCer.label.confirmPassword')}</FormLabel>
          <div className="form-right">
            <Input.Password
              className="form-input"
              value={form.confirmPassword}
              onChange={e => updateField('confirmPassword', e.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
              status={errors.confirmPassword ? 'error' : undefined}
              iconRender={() => null}
            />
            {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
          </div>
        </div>

        {/* ================= SEPARATOR ================= */}
        <div className="key-separator">
          <span className="key-separator-text">Key</span>
          <span className="key-separator-line" />
        </div>

        {/* ================= ADVANCE SETTING ================= */}
        <div className="advance-setting">
          <div className="advance-header" onClick={toggleAdvance}>
            <span className={`advance-arrow ${advanceOpen ? 'open' : ''}`}>{advanceOpen ? '▼' : '▶'}</span>
            <span className="advance-title">{getMessage('uploadProduct.importCer.advanceSetting')}</span>
          </div>

          {advanceOpen && (
            <div className="advance-body">
              {/* Alias */}
              <div className="form-row">
                <FormLabel required>{getMessage('uploadProduct.importCer.label.keyAlias')}</FormLabel>
                <div className="form-right">
                  <div className="file-input-wrapper">
                    <div className="form-line">
                      <Input
                        className="form-input"
                        value={form.keyAlias}
                        onChange={e => updateField('keyAlias', e.target.value)}
                        onBlur={() => handleBlur('keyAlias')}
                        status={errors.keyAlias ? 'error' : undefined}
                      />
                      <img
                        src={fileChooserImg}
                        className="file-icon"
                        onClick={() => csrFileRef.current?.click()}
                        alt="choose file"
                      />
                      <HelpIcon helpKey="keyAlias" />
                    </div>
                  </div>
                  {errors.keyAlias && <div className="field-error">{errors.keyAlias}</div>}
                </div>
              </div>

              {/* CSR file (*.csr) */}
              <div className="form-row">
                <FormLabel required>{getMessage('uploadProduct.importCer.label.csrFile')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <Input
                      className="form-input"
                      value={form.CSRName}
                      onChange={e => updateField('CSRName', e.target.value)}
                      onBlur={() => handleBlur('CSRName')}
                      status={errors.CSRName ? 'error' : undefined}
                    />
                    <HelpIcon helpKey="csrFile" />
                  </div>
                  {errors.CSRName && <div className="field-error">{errors.CSRName}</div>}
                </div>
              </div>

              {/* CSR file save path */}
              <div className="form-row">
                <FormLabel required>{getMessage('uploadProduct.importCer.label.csrSavePath')}</FormLabel>
                <div className="form-right">
                  <div className="file-input-wrapper">
                    <div className="form-line">
                      <input
                        type="text"
                        className="form-path-input"
                        value={form.csrPath}
                        onChange={e => updateField('csrPath', e.target.value)}
                        onBlur={() => handleBlur('csrPath')}
                        placeholder=""
                      />
                      <img
                        src={fileChooserImg}
                        className="file-icon"
                        onClick={() => csrFileRef.current?.click()}
                        alt="choose file"
                      />
                    </div>
                    <div className="path-hint">
                      {getMessage('uploadProduct.importCer.label.fileWillBeCreatedIn')}: {form.csrPath || ''}
                    </div>
                  </div>
                  <input
                    ref={csrFileRef}
                    type="file"
                    accept=".csr"
                    style={{ display: 'none' }}
                    onChange={handleSelectCSR}
                  />
                  {errors.csrPath && <div className="field-error">{errors.csrPath}</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="footer-section">
        <div className="help-tooltip">
          <Popover
            title={getMessage('uploadProduct.importCer.help.title')}
            content={getMessage('uploadProduct.importCer.help.content')}
            trigger="hover"
            placement="right"
          >
            <span className="help-icon">
              <img className="help-img" src={helpImg} alt="help" />
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
