package com.shopping.signing;

import com.google.gson.Gson;
import com.intellij.openapi.util.NlsContexts.DialogMessage;
import org.jetbrains.annotations.NotNull;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Import Certificate CEF Query Handler
 *
 * 处理前端 ImportCer 页面发起的证书导入请求。
 * 注册方式：cefQueryHandlerMap.put(EVENT_IMPORT_CERTIFICATE, new ImportCertificateHandler());
 *
 * 数据流：
 *   前端 ImportCer.handleNext() → sendCefQuery(cfg)
 *     → CEF Bridge → ImportCertificateHandler.onQuery(data, callback)
 *     → callback.success(JSON) → 前端解析响应
 */
public class ImportCertificateHandler implements CefQueryHandler {

    /** 事件名称，与前端 CefQueryCfg action 一致 */
    public static final String EVENT_IMPORT_CERTIFICATE = "ImportCertificate";

    private static final Gson GSON = new Gson();
    private static final ExecutorService EXECUTOR = Executors.newCachedThreadPool();

    @Override
    public void onQuery(@NotNull String data, @NotNull CefQueryCallback callback) {
        EXECUTOR.execute(() -> {
            try {
                // 1. 解析前端请求
                ImportCertificateData.Request request = GSON.fromJson(data, ImportCertificateData.Request.class);

                // 2. 校验必填字段
                String validationError = validateRequest(request);
                if (validationError != null) {
                    String errorJson = GSON.toJson(
                            ImportCertificateData.CefResponse.fail("CERT_INVALID_INPUT", validationError)
                    );
                    callback.success(errorJson);
                    return;
                }

                // 3. 执行证书导入（调用核心逻辑）
                ImportCertificateData.Result result = doImport(request);

                // 4. 返回成功响应
                String successJson = GSON.toJson(
                        ImportCertificateData.CefResponse.ok(result)
                );
                callback.success(successJson);

            } catch (Exception e) {
                // 5. 异常处理
                String errorJson = GSON.toJson(
                        ImportCertificateData.CefResponse.fail("CERT_INTERNAL_ERROR", e.getMessage())
                );
                callback.success(errorJson);
            }
        });
    }

    /**
     * 校验请求字段合法性
     *
     * @return 如果校验失败返回错误消息，成功返回 null
     */
    @DialogMessage
    @SuppressWarnings("DialogTitle")
    private String validateRequest(@NotNull ImportCertificateData.Request request) {
        if (isBlank(request.getP12Name())) {
            return "Key store name is required";
        }
        if (!request.getP12Name().matches("^[a-zA-Z0-9_-]+\\.p12$")) {
            return "Invalid p12 file name format";
        }
        if (isBlank(request.getP12Path())) {
            return "P12 file path is required";
        }
        if (isBlank(request.getPassword())) {
            return "Password is required";
        }
        if (request.getPassword().length() < 6) {
            return "Password must be at least 6 characters";
        }
        if (isBlank(request.getKeyAlias())) {
            return "Key alias is required";
        }
        if (request.getKeyAlias().contains(" ")) {
            return "Key alias cannot contain spaces";
        }
        if (request.getValidity() <= 0) {
            return "Validity must be a positive integer";
        }
        if (isBlank(request.getFirstName())) {
            return "First and last name is required";
        }
        if (isBlank(request.getOrgUnit())) {
            return "Organizational unit is required";
        }
        if (isBlank(request.getOrganization())) {
            return "Organization is required";
        }
        if (isBlank(request.getCity())) {
            return "City or locality is required";
        }
        if (isBlank(request.getProvince())) {
            return "State or province is required";
        }
        if (isBlank(request.getCountryCode()) || !request.getCountryCode().matches("^[A-Z]{2}$")) {
            return "Country code must be 2 uppercase letters";
        }
        if (isBlank(request.getCSRName())) {
            return "CSR file name is required";
        }
        if (isBlank(request.getCsrPath())) {
            return "CSR file path is required";
        }
        return null;
    }

    /**
     * 执行证书导入核心逻辑
     *
     * TODO: 接入实际的 keystore 生成和 CSR 生成逻辑
     */
    private ImportCertificateData.Result doImport(@NotNull ImportCertificateData.Request request) throws Exception {
        // TODO: 实际实现 - 生成 p12 keystore 和 CSR 文件
        // 1. 生成 KeyPair (RSA 2048)
        // 2. 创建自签名证书 (X.509)
        // 3. 生成 PKCS12 keystore
        // 4. 保存到 request.p12Path
        // 5. 生成 CSR 文件
        // 6. 保存到 request.csrPath
        //
        // 示例：
        //   KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
        //   keyGen.initialize(2048);
        //   KeyPair keyPair = keyGen.generateKeyPair();
        //
        //   X500Name subject = new X500Name(
        //       "CN=" + request.getFirstName() +
        //       ", OU=" + request.getOrgUnit() +
        //       ", O=" + request.getOrganization() +
        //       ", L=" + request.getCity() +
        //       ", ST=" + request.getProvince() +
        //       ", C=" + request.getCountryCode()
        //   );
        //
        //   KeyStore ks = KeyStore.getInstance("PKCS12");
        //   ks.load(null, request.getPassword().toCharArray());
        //   ks.setKeyEntry(request.getKeyAlias(), keyPair.getPrivate(), ...);
        //   try (FileOutputStream fos = new FileOutputStream(request.getP12Path())) {
        //       ks.store(fos, request.getPassword().toCharArray());
        //   }

        return new ImportCertificateData.Result(
                "cert-" + System.currentTimeMillis(),
                "2026-01-01",
                "2031-01-01"
        );
    }

    private static boolean isBlank(String str) {
        return str == null || str.trim().isEmpty();
    }
}
