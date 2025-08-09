# React Reader EPUB 阅读器实现

## 概述

本项目已成功集成了 `react-reader` 组件来渲染 EPUB 文件，使用 Electron 自定义协议来安全地访问本地文件，而不会破坏浏览器的安全规则。

## 实现方式

### 1. 自定义协议处理

在主进程 (`src/main.ts`) 中注册了一个自定义协议 `epub-local://`：

```typescript
protocol.registerFileProtocol('epub-local', (request, callback) => {
  const filePath = request.url.replace('epub-local://', '');
  try {
    // 验证文件路径是否在允许的目录中
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.startsWith(app.getPath('userData')) || 
        normalizedPath.startsWith(app.getPath('temp')) ||
        normalizedPath.startsWith(app.getPath('downloads'))) {
      callback({ path: normalizedPath });
    } else {
      callback({ error: 404 });
    }
  } catch (error) {
    console.error('协议处理错误:', error);
    callback({ error: 404 });
  }
});
```

### 2. Preload API 扩展

在 `src/preload.ts` 中添加了 `getLocalFileUrl` 方法：

```typescript
epub: {
  readContent: (filePath: string) => {
    return ipcRenderer.invoke('read-epub-content', filePath);
  },
  getLocalFileUrl: (filePath: string) => {
    return `epub-local://${filePath}`;
  }
}
```

### 3. ReactReader 组件集成

在 `src/components/EpubReader.tsx` 中使用 `react-reader` 组件：

```typescript
import { ReactReader } from 'react-reader';

const EpubReader: React.FC<EpubReaderProps> = ({ book }) => {
  const [location, setLocation] = useState<string | number>(0);
  
  const getEpubUrl = () => {
    if (window.electron?.epub?.getLocalFileUrl) {
      return window.electron.epub.getLocalFileUrl(book.filePath);
    }
    return null;
  };

  return (
    <div className="epub-reader">
      <ReactReader
        url={epubUrl}
        location={location}
        locationChanged={handleLocationChange}
      />
    </div>
  );
};
```

## 安全特性

1. **路径验证**: 只允许访问用户数据目录、临时目录和下载目录中的文件
2. **协议隔离**: 使用自定义协议 `epub-local://` 而不是 `file://` 协议
3. **类型安全**: 完整的 TypeScript 类型定义确保 API 调用的安全性

## 使用方法

1. 启动应用程序：`npm start`
2. 导入 EPUB 文件
3. 点击书籍进入阅读页面
4. 使用 ReactReader 的内置功能进行阅读

## 依赖项

- `react-reader`: ^2.0.13
- `electron`: 37.2.6
- `react`: ^19.1.1

## 优势

1. **安全性**: 不破坏浏览器的安全规则
2. **功能完整**: ReactReader 提供完整的 EPUB 阅读体验
3. **性能**: 直接渲染，无需额外的文件解析
4. **兼容性**: 支持所有标准的 EPUB 格式

## 注意事项

- 确保 EPUB 文件路径在允许的目录范围内
- 自定义协议只在 Electron 环境中有效
- 需要适当的错误处理来应对文件访问失败的情况
