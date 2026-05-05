package com.shopping.signing;

import org.jetbrains.annotations.NotNull;

/**
 * CEF Query Handler 接口
 *
 * 前端通过 sendCefQuery 发起的请求，由注册到 cefQueryHandlerMap 中的 Handler 处理。
 * 每个 Handler 通过动作名称（action）路由。
 */
public interface CefQueryHandler {

    /**
     * 处理 CEF Query
     *
     * @param data     前端发送的请求数据（JSON 字符串）
     * @param callback 回调，用于返回处理结果给前端
     */
    void onQuery(@NotNull String data, @NotNull CefQueryCallback callback);
}
