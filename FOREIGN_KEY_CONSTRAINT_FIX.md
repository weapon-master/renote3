# 外键约束失败修复

## 问题描述

在 `NotesView` 组件中，当尝试保存笔记卡片到数据库时，出现了外键约束失败错误：

```
Database update result: {success: false, error: 'FOREIGN KEY constraint failed'}
```

## 根本原因

1. **时序问题**: 当用户在 EPUB 阅读器中创建新注释时，注释会先保存到 `annotations` 表，然后 `NotesView` 组件会尝试为这些注释创建对应的卡片。但是，可能存在时序问题，导致卡片创建时注释还没有完全保存到数据库。

2. **外键约束**: `cards` 表中的 `annotation_id` 字段有外键约束，引用了 `annotations` 表的 `id` 字段。如果尝试插入卡片时对应的注释不存在，就会触发外键约束失败。

3. **错误处理不足**: 原来的 `batchUpdateCards` 函数没有提供足够的错误信息和处理机制。

## 修复方案

### 1. 改进 `batchUpdateCards` 函数 (`src/main/db/card.ts`)

- **添加注释存在性验证**: 在插入或更新卡片之前，先验证对应的注释是否存在
- **改进错误处理**: 提供更详细的错误信息，包括具体哪些注释不存在
- **容错处理**: 如果某些卡片处理失败，继续处理其他卡片，而不是整个事务失败
- **返回详细信息**: 返回详细的错误信息，帮助调试

```typescript
export function batchUpdateCards(cards: Card[]): { success: boolean; error?: string; details?: string[] } {
    // 验证注释存在性
    const annotationExists = database.prepare('SELECT id FROM annotations WHERE id = ?').get(card.annotationId);
    if (!annotationExists) {
        errors.push(`Annotation with id ${card.annotationId} does not exist`);
        continue; // 跳过这个卡片，继续处理其他卡片
    }
    // ... 其他处理逻辑
}
```

### 2. 改进 `NotesView` 组件的保存逻辑 (`src/components/NotesView.tsx`)

- **预验证注释**: 在尝试保存卡片之前，先验证所有注释都存在于数据库中
- **过滤无效注释**: 如果发现某些注释不存在，过滤掉这些注释，只处理有效的注释
- **改进错误日志**: 提供更详细的错误信息

```typescript
// 验证所有注释都存在
const existingAnnotations = await electron.db.getAnnotationsByBookId(bookId);
const existingAnnotationIds = new Set(existingAnnotations.map((ann: any) => ann.id));
const missingAnnotations = annotationIds.filter(id => !existingAnnotationIds.has(id));

if (missingAnnotations.length > 0) {
    console.warn('Some annotations are missing from database:', missingAnnotations);
    // 过滤掉不存在的注释
    const validNodes = newNodes.filter(node => {
        const annotationId = node.id.replace('card-', '');
        return existingAnnotationIds.has(annotationId);
    });
    // ... 继续处理
}
```

### 3. 更新类型定义 (`src/types/index.ts`)

- 更新 `batchUpdateCards` 的返回类型，包含详细的错误信息

```typescript
batchUpdateCards: (cards: Card[]) => Promise<{ success: boolean; error?: string; details?: string[] }>;
```

### 4. 更新主进程处理器 (`src/main.ts`)

- 确保主进程正确处理新的返回格式

```typescript
ipcMain.handle('batch-update-cards', async (event, cards: any[]) => {
    try {
        const result = batchUpdateCards(cards);
        if (result.success) {
            console.log(`批量更新了 ${cards.length} 个卡片`);
        } else {
            console.error('批量更新卡片失败:', result.error);
        }
        return result;
    } catch (error) {
        console.error('批量更新卡片时出错:', error);
        return { success: false, error: error.message };
    }
});
```

## 测试建议

1. **创建新注释**: 在 EPUB 阅读器中创建新注释，然后切换到笔记视图
2. **检查控制台**: 查看是否有关于缺失注释的警告信息
3. **验证卡片保存**: 确认卡片能够正常保存到数据库
4. **错误恢复**: 测试当某些注释不存在时的错误处理

## 预防措施

1. **确保注释保存完成**: 在创建注释后，确保等待数据库操作完成
2. **添加重试机制**: 如果卡片保存失败，可以添加重试机制
3. **数据一致性检查**: 定期检查注释和卡片数据的一致性
4. **更好的用户反馈**: 当出现错误时，向用户提供友好的错误信息

## 相关文件

- `src/main/db/card.ts`: 卡片数据库操作函数
- `src/components/NotesView.tsx`: 笔记视图组件
- `src/types/index.ts`: 类型定义
- `src/main.ts`: 主进程 IPC 处理器
