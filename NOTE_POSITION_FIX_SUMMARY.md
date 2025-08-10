# 笔记卡片位置数据持久化修复

## 问题描述
当用户在画布中拖拽移动笔记卡片时，位置数据没有保存到数据库中，导致应用重启后位置信息丢失。

## 根本原因
1. 数据库表结构缺少位置和尺寸字段（`position_x`, `position_y`, `width`, `height`）
2. `Annotation` 类型定义缺少视觉属性
3. `NotesView` 组件使用 localStorage 而不是数据库来保存位置数据
4. 缺少相应的数据库操作函数和 API

## 修复内容

### 1. 更新类型定义 (`src/types/index.ts`)
```typescript
export interface Annotation {
  id: string;
  cfiRange: string;
  text: string;
  note: string;
  position?: { x: number; y: number };  // 新增：视觉位置
  width?: number;                       // 新增：卡片宽度
  height?: number;                      // 新增：卡片高度
  createdAt: string;
  updatedAt?: string;
}
```

### 2. 更新数据库表结构 (`src/main/db/common.ts`)
```sql
CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  cfi_range TEXT NOT NULL,
  text TEXT NOT NULL,
  note TEXT NOT NULL,
  position_x REAL DEFAULT 0,        -- 新增：X位置
  position_y REAL DEFAULT 0,        -- 新增：Y位置
  width REAL DEFAULT 200,           -- 新增：宽度
  height REAL DEFAULT 120,          -- 新增：高度
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
)
```

### 3. 添加数据库迁移逻辑
自动检测现有数据库并添加新字段：
```typescript
// 迁移现有注释表以包含视觉属性
const hasPositionX = db.prepare("PRAGMA table_info(annotations)").all().some((col: any) => col.name === 'position_x');
if (!hasPositionX) {
  db.exec(`
    ALTER TABLE annotations ADD COLUMN position_x REAL DEFAULT 0;
    ALTER TABLE annotations ADD COLUMN position_y REAL DEFAULT 0;
    ALTER TABLE annotations ADD COLUMN width REAL DEFAULT 200;
    ALTER TABLE annotations ADD COLUMN height REAL DEFAULT 120;
  `);
}
```

### 4. 更新数据库操作函数 (`src/main/db/annotation.ts`)
- `getAnnotationsByBookId()`: 读取位置和尺寸数据
- `createAnnotation()`: 创建时包含位置和尺寸
- `updateAnnotation()`: 支持更新视觉属性
- `updateBookAnnotations()`: 批量更新时包含视觉属性
- `batchUpdateAnnotationVisuals()`: 新增批量更新视觉属性函数

### 5. 更新 Electron API (`src/main.ts`, `src/preload.ts`)
添加新的 IPC 处理程序：
- `update-annotation`: 更新单个注释
- `batch-update-annotation-visuals`: 批量更新注释视觉属性

### 6. 更新 NotesView 组件 (`src/components/NotesView.tsx`)
- 从注释数据中读取位置信息而不是 localStorage
- 拖拽结束时保存位置数据到数据库
- 移除 localStorage 相关代码

### 7. 更新 EpubReader 组件 (`src/components/EpubReader.tsx`)
创建新注释时包含默认位置信息：
```typescript
const newAnn: Annotation = {
  id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
  cfiRange: pendingSelection.cfiRange,
  text: pendingSelection.text,
  note: noteDraft.trim(),
  position: { x: 50, y: 50 }, // 默认位置
  width: 200, // 默认宽度
  height: 120, // 默认高度
  createdAt: new Date().toISOString(),
};
```

## 测试方法

### 1. 基本功能测试
1. 启动应用程序
2. 导入一本书并创建一些注释
3. 打开笔记视图
4. 拖拽移动笔记卡片
5. 关闭应用程序并重新启动
6. 验证笔记卡片位置是否保持

### 2. 数据库验证
1. 检查数据库文件是否包含新字段
2. 验证位置数据是否正确保存
3. 确认迁移逻辑正常工作

### 3. 边界情况测试
1. 空注释列表
2. 大量注释的性能测试
3. 数据库连接失败的处理

## 预期结果
- 笔记卡片位置数据现在会持久化保存到数据库
- 应用重启后位置信息保持不变
- 不再依赖 localStorage 存储位置数据
- 数据库结构更加完整和一致

## 向后兼容性
- 现有数据库会自动迁移以包含新字段
- 现有注释会获得默认位置值
- 所有现有功能继续正常工作
