/**
 * Import Certificate - 前后端数据交互数据结构定义
 *
 * 页面路径: ImportCer
 * 通信方式: CEF Query (sendCefQuery)
 * Action名: ImportCertificate
 */

// ==================== 请求体 ====================

/** 导入证书请求 payload */
export interface ImportCertificatePayload {
  /** 证书文件名称（含 .p12 后缀） */
  p12Name: string;
  /** .p12 文件保存绝对路径 */
  p12Path: string;
  /** keystore 密码 */
  password: string;
  /** 别名 */
  keyAlias: string;

  /** 证书主题 - Subject */
  validity: number;        // 有效期（年）
  firstName: string;       // 姓名（CN）
  orgUnit: string;         // 组织单位（OU）
  organization: string;    // 组织（O）
  city: string;            // 城市 / Locality（L）
  province: string;        // 省 / State（ST）
  countryCode: string;     // 国家代码（C），2位大写字母

  /** CSR */
  CSRName: string;         // CSR 文件名（含 .csr 后缀）
  csrPath: string;         // CSR 文件保存绝对路径
}

// ==================== 响应体 ====================

/** 导入证书成功响应 */
export interface ImportCertificateResult {
  /** 生成的证书指纹或唯一标识 */
  certificateId?: string;
  /** 证书有效期起始 */
  validFrom?: string;
  /** 证书有效期截止 */
  validTo?: string;
}

// ==================== 错误结构 ====================

/** 后端业务错误 */
export interface BackendError {
  /** 错误码 */
  code: string;
  /** 错误描述 */
  message: string;
}

/** CEF 响应统一信封 */
export interface CefResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: BackendError;
}
