package com.shopping.signing;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.intellij.openapi.fileChooser.FileChooser;
import com.intellij.openapi.fileChooser.FileChooserDescriptor;
import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * CEF Query Handler — 打开 IntelliJ 原生文件选择器
 *
 * 处理前端 ImportCer 页面点击文件夹图标事件。
 * 在 IntelliJ 底层打开原生文件/目录选择对话框，将所选路径回填到前端。
 *
 * 注册方式：cefQueryHandlerMap.put(EVENT_SELECT_FILE_PATH, new SelectFilePathHandler(project));
 *
 * 请求数据格式：
 *   { "extensions": [".p12"], "title": "Select .p12 file" }
 *
 * 响应数据格式：
 *   { "path": "/selected/file.p12" }
 *   用户取消时：{ "path": "" }（无数据，前端不更新）
 */
public class SelectFilePathHandler implements CefQueryHandler {

    public static final String EVENT_SELECT_FILE_PATH = "SelectFilePath";

    private static final Gson GSON = new Gson();
    private static final ExecutorService EXECUTOR = Executors.newCachedThreadPool();

    @Nullable
    private final Project project;

    /**
     * @param project IntelliJ 项目实例，用于获取项目窗口上下文
     */
    public SelectFilePathHandler(@Nullable Project project) {
        this.project = project;
    }

    @Override
    public void onQuery(@NotNull String data, @NotNull CefQueryCallback callback) {
        EXECUTOR.execute(() -> {
            try {
                // 1. 解析前端请求参数
                JsonObject request = GSON.fromJson(data, JsonObject.class);

                // 2. 构造文件选择描述符
                FileChooserDescriptor descriptor;
                if (request.has("extensions") && request.get("extensions").getAsJsonArray().size() > 0) {
                    // 按扩展名过滤 — 例如只显示 .p12 / .csr 文件
                    descriptor = FileChooserDescriptorFactory.createSingleFileDescriptor();
                } else {
                    // 默认选择目录
                    descriptor = FileChooserDescriptorFactory.createSingleFolderDescriptor();
                }

                // 设置对话框标题
                String title = request.has("title") ? request.get("title").getAsString() : "Select file";
                descriptor.setTitle(title);

                // 3. 在 EDT (Event Dispatch Thread) 上打开文件选择器
                VirtualFile file = FileChooser.chooseFile(descriptor, project, null);

                // 4. 返回结果
                JsonObject response = new JsonObject();
                if (file != null) {
                    response.addProperty("path", file.getPath());
                } else {
                    response.addProperty("path", "");
                }
                callback.success(GSON.toJson(response));

            } catch (Exception e) {
                JsonObject error = new JsonObject();
                error.addProperty("path", "");
                callback.success(GSON.toJson(error));
            }
        });
    }
}
