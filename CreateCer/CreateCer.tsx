import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Popover, message } from 'antd';
import { getMessage } from '../../../resource/ProjectMgmtBundle';

import './index.less';

import { CefQueryCfg } from '../../cef/CefQueryCfg';
import { sendCefQuery } from '../../cef/CefQuery';
import { ImportCertificatePayload, ImportCertificateResult } from '../datastructure/ImportCertificateData';
import { FormRow } from './FormRow';

type Props = { onNext: (cerFilePath: string) => void; onCancel: () => void; setLoading: (v: boolean) => void; onFormErrorChange?: (hasError: boolean) => void; };

export const CreateCer = ({ onNext, onCancel, setLoading, onFormErrorChange }: Props): React.JSX.Element => {
  const [formInstance] = Form.useForm();
  const p12Path = Form.useWatch('p12Path', formInstance);
  const csrPath = Form.useWatch('csrPath', formInstance);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const dispatch = useAppDispatch();

  // 首次打开时检查必填字段是否为空
  useEffect(() => {
    const values = formInstance.getFieldsValue(['p12Name', 'p12Path', 'storePassword', 'confirmPassword']);
    const hasEmpty = ['p12Name', 'p12Path', 'storePassword', 'confirmPassword'].some(f => !values[f]);
    onFormErrorChange?.(hasEmpty);
  }, []);

  // 根据主题替换图标
  const theme = useSearchParams('theme');
  const iconFolder = theme === 'dark' ? iconFolderDark : iconFolderLight;
  const iconHelp = theme === 'dark' ? iconHelpDark : iconHelpLight;

  // ── 密码校验规则 ──
  const passwordValidator = (_: any, value: string): Promise<void> => {
    if (!value) {
      return Promise.reject(new Error(getMessage('uploadProduct.createCer.error.passwordRequired')));
    }
    const rules = [
      /[a-z]/,
      /[A-Z]/,
      /\d/,
      /[~!@#$%^&*()\-_=+|[\]{};:'",.<>/?`]/,
    ];
    const matchCount = rules.filter(rule => rule.test(value)).length;
    if (matchCount < 2) {
      return Promise.reject(new Error(getMessage('uploadProduct.createCer.error.passwordComplexity')));
    }
    if (value.length < 8) {
      return Promise.reject(new Error(getMessage('uploadProduct.createCer.error.length')));
    }
    return Promise.resolve();
  };

  // ── 确认密码校验规则 ──
  const confirmPasswordValidator = ({ getFieldValue }: any) => ({
    validator(_: any, value: string): Promise<void> {
      if (!value) {
        return Promise.reject(new Error(getMessage('uploadProduct.createCer.error.confirmPasswordRequired')));
      }
      if (value !== getFieldValue('storePassword')) {
        return Promise.reject(new Error(getMessage('uploadProduct.createCer.error.passwordMismatch')));
      }
      return Promise.resolve();
    },
  });

  // ── CEF 文件选择 ──
  const handleSelectFilePath = (field: string): void => {
    const queryCfg = new CefQueryCfg(EVENT_SELECT_FILE_PATH);
    queryCfg.data = JSON.stringify({
      title: getMessage('uploadProduct.fileChooser.title'),
    });
    queryCfg.success = (data: string): void => {
      try {
        const result = JSON.parse(data);
        if (result.path) {
          formInstance.setFieldValue(field, result.path);
        }
      } catch (err) {
        console.error('CEF file path response parse error:', err, data);
        message.error('Failed to parse file path response');
      }
    };
    queryCfg.fail = (): void => { };
    sendCefQuery(queryCfg);
  };

  const handleSelectP12Path = (): void => handleSelectFilePath('p12Path');
  const handleSelectCSRPath = (): void => handleSelectFilePath('csrPath');

  // ── 成功/失败处理 ──
  const handleSuccessResponse = (data: string): void => {
    setLoading(false);
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
      const msg = response.error;
      Modal.error({
        title: 'Error',
        content: msg,
        okText: getMessage('button.ok'),
      });
    } catch (err) {
      console.error('handleSuccessResponse parse error:', { error: err, rawData: data });
      message.error('Invalid response from server');
    }
  };

  const handleQueryFail = (errorCode: number, errorMessage: string): void => {
    setLoading(false);
    message.error(errorMessage || `CEF error (code: ${errorCode})`);
  };

  // ── 提交 ──
  const onFinish = (values: any): void => {
    setLoading(true);
    const payload: createCertificatePayload = {
      p12Name: values.p12Name,
      p12Path: values.p12Path,
      password: values.storePassword,
      confirmPassword: values.confirmPassword,
      keyAlias: values.keyAlias,
      validity: values.validity ?? 25,
      firstName: values.firstName || values.keyAlias,
      orgUnit: values.orgUnit,
      organization: values.organization,
      city: values.city,
      province: values.province,
      countryCode: values.countryCode,
      csrName: values.csrName,
      csrPath: values.csrPath,
    };
    const queryCfg = new CefQueryCfg(EVENT_CREATE_CERTIFICATE);
    queryCfg.data = JSON.stringify(payload);
    queryCfg.success = (data: string): void => handleSuccessResponse(data);
    queryCfg.fail = (errorCode: number, errorMessage: string): void => handleQueryFail(errorCode, errorMessage);
    sendCefQuery(queryCfg);
  };

  const toggleAdvance = (): void => { setAdvanceOpen(prev => !prev); };

  return (
    <div className={'signForm'}>
      <Form
        form={formInstance}
        id="cer-form"
        autoComplete={'off'}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        onFinish={onFinish}
        onFieldsChange={(_changedFields, allFields): void => {
          const errors: Record<string, string> = {};
          allFields.forEach(f => {
            const name = Array.isArray(f.name) ? String(f.name[0]) : String(f.name);
            if (f.errors?.length) {
              errors[name] = String(f.errors[0]);
            }
          });
          setFieldErrors(errors);
          // 同时校验空字段，处理首次打开时无校验记录的问题
          const values = formInstance.getFieldsValue(['p12Name', 'p12Path', 'storePassword', 'confirmPassword']);
          const hasEmpty = ['p12Name', 'p12Path', 'storePassword', 'confirmPassword'].some(f => !values[f]);
          onFormErrorChange?.(Object.keys(errors).length > 0 || hasEmpty);
        }}
      >
        {/* ================= Key store name (*.p12) ================= */}
        <Form.Item label={getMessage('uploadProduct.createCer.label.p12FileName')} labelAlign="left" required
          validateStatus={fieldErrors.p12Name ? 'error' : undefined}
          help={fieldErrors.p12Name}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Form.Item
              name={'p12Name'}
              rules={[{ required: true, message: getMessage('signing.form.msg.text.box.empty') }]}
              noStyle
            >
              <Input className={'fieldArea'} style={{ marginRight: '6px' }} disabled={false} />
            </Form.Item>
            <Popover placement={'left'} trigger={'hover'} content={ToolTipMsg('p12Name')}>
              <img src={iconHelp} className={'qco-icon img-logo'} />
            </Popover>
          </div>
        </Form.Item>

        {/* ================= Select file save path (p12) ================= */}
        <Form.Item label={getMessage('uploadProduct.createCer.label.savePath')} labelAlign="left" required
          validateStatus={fieldErrors.p12Path ? 'error' : undefined}
          help={fieldErrors.p12Path}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Form.Item
              name={'p12Path'}
              rules={[{ required: true, message: getMessage('signing.form.msg.text.box.empty') }]}
              noStyle
            >
              <Input
                className={'fieldArea'}
                style={{ marginRight: '8px' }}
                suffix={<img className={'img-logo'} src={iconFolder} style={{ opacity: 1 }} onClick={handleSelectP12Path} />}
                disabled={false}
              />
            </Form.Item>
            {getMessage('uploadProduct.createCer.label.fileWillBeCreatedIn')} {p12Path || ''}
          </div>
        </Form.Item>

        {/* ================= Key store password ================= */}
        <Form.Item label={getMessage('signing.form.label.store.password')} labelAlign="left" required
          validateStatus={fieldErrors.storePassword ? 'error' : undefined}
          help={fieldErrors.storePassword}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Form.Item
              name={'storePassword'}
              rules={[
                { validator: passwordValidator },
                { min: 6, max: 64, message: getMessage('signing.form.msg.store.password.length') },
              ]}
              noStyle
            >
              <Input className={'fieldArea'} disabled={false} type={'password'} />
            </Form.Item>
            <Popover placement={'left'} trigger={'hover'} content={ToolTipMsg('storePassword')}>
              <img src={iconHelp} className={'qco-icon img-logo'} />
            </Popover>
          </div>
        </Form.Item>

        {/* ================= Confirm password ================= */}
        <Form.Item label={getMessage('uploadProduct.createCer.label.confirmPassword')} labelAlign="left" required
          validateStatus={fieldErrors.confirmPassword ? 'error' : undefined}
          help={fieldErrors.confirmPassword}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Form.Item
              name={'confirmPassword'}
              dependencies={['storePassword']}
              rules={[
                { required: true, message: getMessage('signing.form.msg.text.box.empty') },
                confirmPasswordValidator,
              ]}
              noStyle
            >
              <Input className={'fieldArea'} disabled={false} type={'password'} />
            </Form.Item>
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

        {/* ================= Alias ================= */}
        <Form.Item label={getMessage('uploadProduct.createCer.label.keyAlias')} labelAlign="left" required
          validateStatus={fieldErrors.keyAlias ? 'error' : undefined}
          help={fieldErrors.keyAlias}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: -20 }}>
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
              {/* Validity(years) */}
              <div className="form-row">
                <span className="form-label"><span className="required-star">*</span>{getMessage('uploadProduct.createCer.label.validity')}</span>
                <div className="form-right">
                  <Form.Item name="validity" noStyle initialValue={25}>
                    <InputNumber
                      className="form-input-number"
                      min={1}
                      max={100}
                    />
                  </Form.Item>
                </div>
              </div>

              {/* First and last name */}
              <FormRow
                title={getMessage('uploadProduct.createCer.label.firstName')}
                name="firstName"
                helpKey="firstName"
              />
              {/* Organizational unit */}
              <FormRow
                title={getMessage('uploadProduct.createCer.label.orgUnit')}
                name="orgUnit"
                helpKey="orgUnit"
              />
              {/* Organization */}
              <FormRow
                title={getMessage('uploadProduct.createCer.label.organization')}
                name="organization"
                helpKey="organization"
              />
              {/* City or locality */}
              <FormRow
                title={getMessage('uploadProduct.createCer.label.city')}
                name="city"
                helpKey="city"
              />
              {/* State or province */}
              <FormRow
                title={getMessage('uploadProduct.createCer.label.province')}
                name="province"
                helpKey="province"
              />
              {/* Country code(XX) */}
              <FormRow
                title={getMessage('uploadProduct.createCer.label.countryCode')}
                name="countryCode"
                helpKey="countryCode"
                maxLength={2}
              />
            </div>
          )}
        </div>

        {/* ================= CSR file (*.csr) ================= */}
        <Form.Item label={getMessage('uploadProduct.createCer.label.csrFile')} labelAlign="left" required
          validateStatus={fieldErrors.csrName ? 'error' : undefined}
          help={fieldErrors.csrName}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Form.Item name={'csrName'} noStyle>
              <Input className={'fieldArea'} style={{ marginRight: '6px' }} />
            </Form.Item>
            <Popover placement={'left'} trigger={'hover'} content={ToolTipMsg('csrFile')}>
              <img src={iconHelp} className={'qco-icon img-logo'} />
            </Popover>
          </div>
        </Form.Item>

        {/* ================= Select file save path (CSR) ================= */}
        <Form.Item label={getMessage('uploadProduct.createCer.label.csrSavePath')} labelAlign="left" required
          validateStatus={fieldErrors.csrPath ? 'error' : undefined}
          help={fieldErrors.csrPath}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Form.Item name={'csrPath'} noStyle>
              <Input
                className={'fieldArea'}
                style={{ marginRight: '6px' }}
                suffix={<img className={'img-logo'} src={iconFolder} style={{ opacity: 1 }} onClick={handleSelectCSRPath} alt="choose csr file" />}
                disabled={false}
              />
            </Form.Item>
            <Popover placement={'left'} trigger={'hover'} content={ToolTipMsg('keyStoreName')}>
              <img src={iconHelp} className={'qco-icon img-logo'} />
            </Popover>
          </div>
          <div className="path-hint">
            {getMessage('uploadProduct.createCer.label.fileWillBeCreatedIn')} {csrPath || ''}
          </div>
        </Form.Item>

      </Form>
    </div>
  );
};
