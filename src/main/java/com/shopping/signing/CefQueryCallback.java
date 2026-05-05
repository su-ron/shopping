package com.shopping.signing;

import org.jetbrains.annotations.NotNull;

/**
 * CEF Query 回调接口
 *
 * Handler 处理完成后通过此回调返回结果给前端。
 */
public interface CefQueryCallback {

    /**
     * 处理成功，返回数据给前端
     *
     * @param response 响应数据（JSON 字符串），由前端 CefQueryCfg.success 接收
     */
    void success(@NotNull String response);

    /**
     * 处理失败，返回错误信息给前端
     *
     * @param errorCode    错误码
     * @param errorMessage 错误描述，由前端 CefQueryCfg.failure 接收
     */
    void failure(int errorCode, @NotNull String errorMessage);
}
