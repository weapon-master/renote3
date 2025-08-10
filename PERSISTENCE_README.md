# 书籍持久化功能说明

## 问题描述
在之前的版本中，导入的书籍数据只存储在React组件的状态中，当应用关闭或页面切换时，这些数据会丢失。

## 解决方案
我们实现了完整的书籍数据持久化存储系统，使用SQLite数据库：

### 1. 数据库存储
- 使用SQLite数据库存储书籍和注释数据
- 数据库文件保存在用户数据目录中
- 实现了完整的CRUD操作和事务支持

### 2. 新增的API接口
- `load-books`: 从数据库加载书籍数据
- `delete-book`: 删除指定书籍
- `update-book`: 更新书籍信息
- `create-book`: 创建新书籍

### 3. 前端集成
- 组件挂载时自动从数据库加载书籍数据
- 书籍数据变化时自动保存到数据库
- 支持删除、编辑、重排序等操作的持久化

## 技术实现

### 数据库层 (src/main/db/)
```typescript
// 数据库初始化
initDatabase();

// 书籍操作
getAllBooks(): Book[]
getBookById(id: string): Book | null
createBook(book: Omit<Book, 'id' | 'annotations'>): Book
updateBook(id: string, updates: Partial<Book>): boolean
deleteBook(id: string): boolean

// 注释操作
getAnnotationsByBookId(bookId: string): Annotation[]
createAnnotation(annotation: Omit<Annotation, 'id'>): Annotation
updateAnnotation(id: string, updates: Partial<Annotation>): boolean
deleteAnnotation(id: string): boolean
```

### 主进程 (src/main.ts)
```typescript
// 加载保存的书籍数据
ipcMain.handle('load-books', async () => {
  const books = getAllBooks();
  return books;
});

// 删除书籍
ipcMain.handle('delete-book', async (event, bookId: string) => {
  const success = deleteBook(bookId);
  return { success };
});
```

### 预加载脚本 (src/preload.ts)
```typescript
// 数据库API
books: {
  load: () => ipcRenderer.invoke('load-books'),
  delete: (bookId: string) => ipcRenderer.invoke('delete-book', bookId),
  update: (bookId: string, updates: any) => ipcRenderer.invoke('update-book', bookId, updates)
}
```

### 前端组件 (src/components/BookShelf.tsx)
```typescript
// 从数据库加载书籍数据
const loadBooksFromDatabase = async () => {
  const savedBooks = await electron.books.load();
  setBooks(savedBooks || []);
};

// 组件挂载时加载书籍数据
useEffect(() => {
  loadBooksFromDatabase();
}, []);
```

## 数据存储位置
- **Windows**: `%APPDATA%\renote3\database.db`
- **macOS**: `~/Library/Application Support/renote3/database.db`
- **Linux**: `~/.config/renote3/database.db`

## 功能特性
1. **自动保存**: 每次书籍数据变化时自动保存到数据库
2. **自动加载**: 应用启动时自动从数据库加载书籍数据
3. **错误处理**: 包含完整的错误处理和日志记录
4. **事务支持**: 支持数据库事务，确保数据一致性
5. **性能优化**: 使用SQLite索引优化查询性能
6. **数据完整性**: 支持外键约束和数据验证

## 使用方法
1. 启动应用后，书架会自动从数据库加载之前保存的书籍
2. 导入新书籍时，数据会自动保存到数据库
3. 删除、编辑书籍时，更改会立即保存到数据库
4. 关闭应用后重新打开，所有书籍数据仍然存在

## 注意事项
- 确保应用有足够的权限访问用户数据目录
- 书籍文件路径仍然需要保持有效
- 如果书籍文件被移动或删除，需要重新导入
- 建议定期备份`database.db`文件
- 数据库文件是二进制格式，不要手动编辑

## 测试验证
1. 导入几本书籍
2. 关闭应用
3. 重新打开应用
4. 检查书籍是否仍然显示在书架中
5. 尝试编辑、删除书籍，然后重新打开应用验证更改是否保持
