package com.shopping.signing;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.fileChooser.FileChooser;
import com.intellij.openapi.fileChooser.FileChooserDescriptor;
import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;

/**
 * CEF Query Handler — 打开 IntelliJ 原生文件夹选择器
 *
 * 处理前端 ImportCer 页面点击文件夹图标事件。
 * 在 IntelliJ 底层打开原生目录选择对话框，将所选路径回填到前端。
 *
 * 注册方式：cefQueryHandlerMap.put(EVENT_SELECT_FILE_PATH, new SelectFilePathHandler(project));
 *
 * 请求数据格式：
 *   { "title": "Select folder" }
 *
 * 响应数据格式：
 *   { "path": "/selected/folder" }
 *   用户取消时：{ "path": "" }（无数据，前端不更新）
 *
 * 注意：FileChooser.chooseFile() 必须在 EDT 线程上调用，
 * 此处通过 ApplicationManager.getApplication().invokeAndWait() 确保。
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

                // 2. 构造文件夹选择描述符（选择保存路径，而非文件本身）
                FileChooserDescriptor descriptor = FileChooserDescriptorFactory.createSingleFolderDescriptor();
                String title = request.has("title") ? request.get("title").getAsString() : "Select folder";
                descriptor.setTitle(title);

                // 3. 在 EDT 上打开文件选择器（FileChooser.chooseFile 必须在 EDT 调用）
                AtomicReference<VirtualFile> fileRef = new AtomicReference<>();
                ApplicationManager.getApplication().invokeAndWait(() -> {
                    fileRef.set(FileChooser.chooseFile(descriptor, project, null));
                });
                VirtualFile file = fileRef.get();

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
