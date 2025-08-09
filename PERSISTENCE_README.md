# 书籍持久化功能说明

## 问题描述
在之前的版本中，导入的书籍数据只存储在React组件的状态中，当应用关闭或页面切换时，这些数据会丢失。

## 解决方案
我们实现了完整的书籍数据持久化存储系统，包括：

### 1. 主进程持久化存储
- 使用Electron的`app.getPath('userData')`来获取用户数据目录
- 书籍数据保存在`books.json`文件中
- 实现了自动保存和加载功能

### 2. 新增的API接口
- `load-books`: 从本地文件加载书籍数据
- `save-books`: 保存书籍数据到本地文件
- `delete-book`: 删除指定书籍
- `update-book`: 更新书籍信息

### 3. 前端集成
- 组件挂载时自动加载保存的书籍数据
- 书籍数据变化时自动保存到本地存储
- 支持删除、编辑、重排序等操作的持久化

## 技术实现

### 主进程 (src/main.ts)
```typescript
// 书籍数据文件路径
const BOOKS_DATA_FILE = path.join(app.getPath('userData'), 'books.json');

// 加载保存的书籍数据
function loadBooksData(): any[] { ... }

// 保存书籍数据到本地文件
function saveBooksData(books: any[]): void { ... }
```

### 预加载脚本 (src/preload.ts)
```typescript
// 新增的持久化API
books: {
  load: () => ipcRenderer.invoke('load-books'),
  save: (books: any[]) => ipcRenderer.invoke('save-books', books),
  delete: (bookId: string) => ipcRenderer.invoke('delete-book', bookId),
  update: (bookId: string, updates: any) => ipcRenderer.invoke('update-book', bookId, updates)
}
```

### 前端组件 (src/components/BookShelf.tsx)
```typescript
// 从本地存储加载书籍数据
const loadBooksFromStorage = async () => { ... }

// 保存书籍数据到本地存储
const saveBooksToStorage = async (booksToSave: Book[]) => { ... }

// 组件挂载时加载书籍数据
useEffect(() => {
  loadBooksFromStorage();
}, []);

// 当书籍数据变化时自动保存
useEffect(() => {
  if (!isLoading && books.length > 0) {
    saveBooksToStorage(books);
  }
}, [books, isLoading]);
```

## 数据存储位置
- **Windows**: `%APPDATA%\renote3\books.json`
- **macOS**: `~/Library/Application Support/renote3/books.json`
- **Linux**: `~/.config/renote3/books.json`

## 功能特性
1. **自动保存**: 每次书籍数据变化时自动保存到本地文件
2. **自动加载**: 应用启动时自动加载之前保存的书籍数据
3. **错误处理**: 包含完整的错误处理和日志记录
4. **向后兼容**: 支持现有的书籍导入和显示功能
5. **性能优化**: 只在数据变化时保存，避免不必要的文件操作

## 使用方法
1. 启动应用后，书架会自动加载之前保存的书籍
2. 导入新书籍时，数据会自动保存到本地存储
3. 删除、编辑书籍时，更改会立即保存
4. 关闭应用后重新打开，所有书籍数据仍然存在

## 注意事项
- 确保应用有足够的权限访问用户数据目录
- 书籍文件路径仍然需要保持有效
- 如果书籍文件被移动或删除，需要重新导入
- 建议定期备份`books.json`文件

## 测试验证
1. 导入几本书籍
2. 关闭应用
3. 重新打开应用
4. 检查书籍是否仍然显示在书架中
5. 尝试编辑、删除书籍，然后重新打开应用验证更改是否保持
