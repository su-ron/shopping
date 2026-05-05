package com.shopping.signing;

/**
 * CEF Query 事件常量
 *
 * 维护所有 CEF Query action 名称与 Handler 的映射注册。
 * 注册方式：在插件初始化阶段调用 registerAll()。
 */
public final class CefEventConstants {

    // ==================== Signing/UploadProduct ====================

    /** 加载产品数据 */
    public static final String EVENT_UPLOAD_LOAD_PRODUCT = "LoadUploadProject";

    /** 导入证书 */
    public static final String EVENT_IMPORT_CERTIFICATE = "ImportCertificate";

    /** 打开 IntelliJ 原生文件选择器 */
    public static final String EVENT_SELECT_FILE_PATH = "SelectFilePath";

    private CefEventConstants() {
    }

    /**
     * 注册所有 CEF Query Handler
     *
     * 在插件启动/初始化时调用，将事件名与 Handler 实例绑定到路由表。
     *
     * @param handlerMap 路由表，形如 Map<String, CefQueryHandler>
     * @param project    IntelliJ 项目实例（用于文件选择器等需要项目上下文的 Handler）
     */
    public static void registerAll(java.util.Map<String, CefQueryHandler> handlerMap,
                                   @org.jetbrains.annotations.Nullable com.intellij.openapi.project.Project project) {
        // LoadUploadProject — 已有实现
        // handlerMap.put(EVENT_UPLOAD_LOAD_PRODUCT, new LoadUploadProjectHandler());

        // ImportCertificate
        handlerMap.put(EVENT_IMPORT_CERTIFICATE, new ImportCertificateHandler());

        // SelectFilePath — 需要 project 以打开 IntelliJ 原生文件选择器
        if (project != null) {
            handlerMap.put(EVENT_SELECT_FILE_PATH, new SelectFilePathHandler(project));
        }
    }
}
