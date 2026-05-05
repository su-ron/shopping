import React, { useState, useRef } from 'react';
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
    validity: undefined,
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
      case 'validity': {
        if (form.validity === undefined || form.validity === null) {
          error = getMessage('uploadProduct.importCer.error.validityRequired');
        } else if (!Number.isInteger(form.validity) || form.validity <= 0) {
          error = getMessage('uploadProduct.importCer.error.validityFormat');
        }
        break;
      }
      case 'firstName':
        if (!form.firstName) {
          error = getMessage('uploadProduct.importCer.error.firstNameRequired');
        }
        break;
      case 'orgUnit':
        if (!form.orgUnit) {
          error = getMessage('uploadProduct.importCer.error.orgUnitRequired');
        }
        break;
      case 'organization':
        if (!form.organization) {
          error = getMessage('uploadProduct.importCer.error.organizationRequired');
        }
        break;
      case 'city':
        if (!form.city) {
          error = getMessage('uploadProduct.importCer.error.cityRequired');
        }
        break;
      case 'province':
        if (!form.province) {
          error = getMessage('uploadProduct.importCer.error.provinceRequired');
        }
        break;
      case 'countryCode': {
        const value = form.countryCode;
        if (!value) {
          error = getMessage('uploadProduct.importCer.error.countryCodeRequired');
        } else if (!/^[A-Z]{2}$/.test(value)) {
          error = getMessage('uploadProduct.importCer.error.countryCodeFormat');
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
      'keyAlias', 'validity', 'firstName', 'orgUnit',
      'organization', 'city', 'province', 'countryCode',
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
    const payload: ImportCertificatePayload = {
      p12Name: form.p12Name,
      p12Path: form.p12Path,
      password: form.password,
      keyAlias: form.keyAlias,
      validity: form.validity!,
      firstName: form.firstName,
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
          // 成功 → 进入下一步
          onNext();
        } else {
          // 业务错误 → 显示后端返回的错误信息
          message.error(response.error?.message || 'Import failed');
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

  const FormLabel = ({ required, children }: { required?: boolean; children: React.ReactNode }) => (
    <span className="form-label">
      {required && <span className="required-star">*</span>}
      {children}
    </span>
  );

  // 统一帮助图标组件：无内容时渲染占位符以保持对齐
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
            <img src={helpImg} className="help-icon" alt="help" />
          </Popover>
        )}
      </span>
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
                    src={fileChooserImg}
                    className="file-icon"
                    onClick={() => p12FileRef.current?.click()}
                    alt="choose file"
                  />
                </div>
                <HelpIcon helpKey="__none__" />
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
            <div className="form-line">
              <Input.Password
                className="form-input"
                value={form.password}
                onChange={e => updateField('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                status={errors.password ? 'error' : undefined}
                iconRender={() => null}
              />
              <HelpIcon helpKey="__none__" />
            </div>
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>
        </div>

        {/* Confirm password */}
        <div className="form-row">
          <FormLabel required>{getMessage('uploadProduct.importCer.label.confirmPassword')}</FormLabel>
          <div className="form-right">
            <div className="form-line">
              <Input.Password
                className="form-input"
                value={form.confirmPassword}
                onChange={e => updateField('confirmPassword', e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                status={errors.confirmPassword ? 'error' : undefined}
                iconRender={() => null}
              />
              <HelpIcon helpKey="__none__" />
            </div>
            {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
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
                <div className="input-icon-wrapper">
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
                    onClick={() => p12FileRef.current?.click()}
                    alt="choose file"
                  />
                </div>
                <HelpIcon helpKey="keyAlias" />
              </div>
            </div>
            {errors.keyAlias && <div className="field-error">{errors.keyAlias}</div>}
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
                  <InputNumber
                    className="form-input-number"
                    min={1}
                    max={100}
                    value={form.validity}
                    onChange={value => updateField('validity', value ?? undefined)}
                    onBlur={() => handleBlur('validity')}
                    status={errors.validity ? 'error' : undefined}
                  />
                  {errors.validity && <div className="field-error">{errors.validity}</div>}
                </div>
              </div>

              {/* First and last name */}
              <div className="form-row">
                <FormLabel required>{getMessage('uploadProduct.importCer.label.firstName')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <Input
                      className="form-input"
                      value={form.firstName}
                      onChange={e => updateField('firstName', e.target.value)}
                      onBlur={() => handleBlur('firstName')}
                      status={errors.firstName ? 'error' : undefined}
                    />
                    <HelpIcon helpKey="firstName" />
                  </div>
                  {errors.firstName && <div className="field-error">{errors.firstName}</div>}
                </div>
              </div>

              {/* Organizational unit */}
              <div className="form-row">
                <FormLabel required>{getMessage('uploadProduct.importCer.label.orgUnit')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <Input
                      className="form-input"
                      value={form.orgUnit}
                      onChange={e => updateField('orgUnit', e.target.value)}
                      onBlur={() => handleBlur('orgUnit')}
                      status={errors.orgUnit ? 'error' : undefined}
                    />
                    <HelpIcon helpKey="orgUnit" />
                  </div>
                  {errors.orgUnit && <div className="field-error">{errors.orgUnit}</div>}
                </div>
              </div>

              {/* Organization */}
              <div className="form-row">
                <FormLabel required>{getMessage('uploadProduct.importCer.label.organization')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <Input
                      className="form-input"
                      value={form.organization}
                      onChange={e => updateField('organization', e.target.value)}
                      onBlur={() => handleBlur('organization')}
                      status={errors.organization ? 'error' : undefined}
                    />
                    <HelpIcon helpKey="organization" />
                  </div>
                  {errors.organization && <div className="field-error">{errors.organization}</div>}
                </div>
              </div>

              {/* City or locality */}
              <div className="form-row">
                <FormLabel required>{getMessage('uploadProduct.importCer.label.city')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <Input
                      className="form-input"
                      value={form.city}
                      onChange={e => updateField('city', e.target.value)}
                      onBlur={() => handleBlur('city')}
                      status={errors.city ? 'error' : undefined}
                    />
                    <HelpIcon helpKey="city" />
                  </div>
                  {errors.city && <div className="field-error">{errors.city}</div>}
                </div>
              </div>

              {/* State or province */}
              <div className="form-row">
                <FormLabel required>{getMessage('uploadProduct.importCer.label.province')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <Input
                      className="form-input"
                      value={form.province}
                      onChange={e => updateField('province', e.target.value)}
                      onBlur={() => handleBlur('province')}
                      status={errors.province ? 'error' : undefined}
                    />
                    <HelpIcon helpKey="province" />
                  </div>
                  {errors.province && <div className="field-error">{errors.province}</div>}
                </div>
              </div>

              {/* Country code(XX) */}
              <div className="form-row">
                <FormLabel required>{getMessage('uploadProduct.importCer.label.countryCode')}</FormLabel>
                <div className="form-right">
                  <div className="form-line">
                    <Input
                      className="form-input"
                      value={form.countryCode}
                      onChange={e => updateField('countryCode', e.target.value)}
                      onBlur={() => handleBlur('countryCode')}
                      status={errors.countryCode ? 'error' : undefined}
                      maxLength={2}
                    />
                    <HelpIcon helpKey="__none__" />
                  </div>
                  {errors.countryCode && <div className="field-error">{errors.countryCode}</div>}
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

        {/* Select file save path (CSR) */}
        <div className="form-row">
          <FormLabel required>{getMessage('uploadProduct.importCer.label.csrSavePath')}</FormLabel>
          <div className="form-right">
            <div className="file-input-wrapper">
              <div className="form-line">
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
                    src={fileChooserImg}
                    className="file-icon"
                    onClick={() => csrFileRef.current?.click()}
                    alt="choose file"
                  />
                </div>
                <HelpIcon helpKey="__none__" />
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
