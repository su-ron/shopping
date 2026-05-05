package com.shopping.signing;

import com.intellij.openapi.util.NlsContexts.DialogMessage;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Import Certificate - 前后端数据交互 DTO
 *
 * 对应前端 datastructure/ImportCertificateData.ts
 * 通过 CEF Query (action: "ImportCertificate") 通信
 */
public final class ImportCertificateData {

    private ImportCertificateData() {
    }

    // ==================== 请求体 ====================

    /** 前端导入证书请求 */
    public static final class Request {
        /** 证书文件名称（含 .p12 后缀） */
        private String p12Name;
        /** .p12 文件保存绝对路径 */
        private String p12Path;
        /** keystore 密码 */
        private String password;
        /** 别名 */
        private String keyAlias;

        /** 有效期（年） */
        private int validity;
        /** 姓名（CN） */
        private String firstName;
        /** 组织单位（OU） */
        private String orgUnit;
        /** 组织（O） */
        private String organization;
        /** 城市 / Locality（L） */
        private String city;
        /** 省 / State（ST） */
        private String province;
        /** 国家代码（C） */
        private String countryCode;

        /** CSR 文件名 */
        private String CSRName;
        /** CSR 文件保存绝对路径 */
        private String csrPath;

        public Request() {
        }

        @NotNull
        public String getP12Name() {
            return p12Name;
        }

        public void setP12Name(@NotNull String p12Name) {
            this.p12Name = p12Name;
        }

        @NotNull
        public String getP12Path() {
            return p12Path;
        }

        public void setP12Path(@NotNull String p12Path) {
            this.p12Path = p12Path;
        }

        @NotNull
        public String getPassword() {
            return password;
        }

        public void setPassword(@NotNull String password) {
            this.password = password;
        }

        @NotNull
        public String getKeyAlias() {
            return keyAlias;
        }

        public void setKeyAlias(@NotNull String keyAlias) {
            this.keyAlias = keyAlias;
        }

        public int getValidity() {
            return validity;
        }

        public void setValidity(int validity) {
            this.validity = validity;
        }

        @NotNull
        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(@NotNull String firstName) {
            this.firstName = firstName;
        }

        @NotNull
        public String getOrgUnit() {
            return orgUnit;
        }

        public void setOrgUnit(@NotNull String orgUnit) {
            this.orgUnit = orgUnit;
        }

        @NotNull
        public String getOrganization() {
            return organization;
        }

        public void setOrganization(@NotNull String organization) {
            this.organization = organization;
        }

        @NotNull
        public String getCity() {
            return city;
        }

        public void setCity(@NotNull String city) {
            this.city = city;
        }

        @NotNull
        public String getProvince() {
            return province;
        }

        public void setProvince(@NotNull String province) {
            this.province = province;
        }

        @NotNull
        public String getCountryCode() {
            return countryCode;
        }

        public void setCountryCode(@NotNull String countryCode) {
            this.countryCode = countryCode;
        }

        @NotNull
        public String getCSRName() {
            return CSRName;
        }

        public void setCSRName(@NotNull String CSRName) {
            this.CSRName = CSRName;
        }

        @NotNull
        public String getCsrPath() {
            return csrPath;
        }

        public void setCsrPath(@NotNull String csrPath) {
            this.csrPath = csrPath;
        }
    }

    // ==================== 响应体 ====================

    /** 导入证书成功响应 */
    public static final class Result {
        /** 生成的证书指纹或唯一标识 */
        @Nullable
        private String certificateId;
        /** 证书有效期起始 */
        @Nullable
        private String validFrom;
        /** 证书有效期截止 */
        @Nullable
        private String validTo;

        public Result() {
        }

        public Result(@Nullable String certificateId, @Nullable String validFrom, @Nullable String validTo) {
            this.certificateId = certificateId;
            this.validFrom = validFrom;
            this.validTo = validTo;
        }

        @Nullable
        public String getCertificateId() {
            return certificateId;
        }

        public void setCertificateId(@Nullable String certificateId) {
            this.certificateId = certificateId;
        }

        @Nullable
        public String getValidFrom() {
            return validFrom;
        }

        public void setValidFrom(@Nullable String validFrom) {
            this.validFrom = validFrom;
        }

        @Nullable
        public String getValidTo() {
            return validTo;
        }

        public void setValidTo(@Nullable String validTo) {
            this.validTo = validTo;
        }
    }

    // ==================== 错误结构 ====================

    /** 后端业务错误 */
    public static final class Error {
        private String code;
        private String message;

        public Error() {
        }

        public Error(@NotNull String code, @NotNull String message) {
            this.code = code;
            this.message = message;
        }

        @NotNull
        public String getCode() {
            return code;
        }

        public void setCode(@NotNull String code) {
            this.code = code;
        }

        @NotNull
        public String getMessage() {
            return message;
        }

        public void setMessage(@NotNull String message) {
            this.message = message;
        }
    }

    // ==================== CEF 响应信封 ====================

    /** 统一响应信封 */
    public static final class CefResponse<T> {
        private boolean success;
        @Nullable
        private T data;
        @Nullable
        private Error error;

        public CefResponse() {
        }

        public CefResponse(boolean success, @Nullable T data, @Nullable Error error) {
            this.success = success;
            this.data = data;
            this.error = error;
        }

        public static <T> CefResponse<T> ok(@Nullable T data) {
            return new CefResponse<>(true, data, null);
        }

        public static <T> CefResponse<T> fail(@NotNull String code, @NotNull String message) {
            return new CefResponse<>(false, null, new Error(code, message));
        }

        public boolean isSuccess() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }

        @Nullable
        public T getData() {
            return data;
        }

        public void setData(@Nullable T data) {
            this.data = data;
        }

        @Nullable
        public Error getError() {
            return error;
        }

        public void setError(@Nullable Error error) {
            this.error = error;
        }
    }
}
