# 卡片位置持久化修复

## 问题描述

当移动卡片时，不是所有卡片的位置都被正确保存到数据库。部分卡片的移动操作丢失，导致位置不一致。

## 根本原因

1. **Debounce 延迟过长**: 原来的 `saveAnnotations` 函数使用了 1000ms 的 debounce 延迟，如果用户在 1 秒内多次移动卡片，只有最后一次移动会被保存。

2. **缺少停止移动检测**: 没有机制检测卡片何时停止移动，导致中间的位置更新丢失。

3. **错误处理不完善**: 当某些注释不存在时，整个保存操作可能失败，但没有足够的错误信息来诊断问题。

4. **验证逻辑过于严格**: 在保存前过滤掉不存在的注释，可能导致有效的卡片也被跳过。

## 修复方案

### 1. 优化保存策略

- **减少 debounce 延迟**: 从 1000ms 减少到 300ms，提高响应性
- **添加立即保存机制**: 在卡片停止移动 500ms 后立即保存，确保最终位置被保存
- **双重保存机制**: 使用 debounce 处理连续移动，使用超时处理停止移动

```typescript
// 立即保存函数，不使用 debounce
const saveAnnotationsImmediate = async (newNodes: Node<{ annotation: Annotation }>[], bookId: string) => {
  // 立即保存逻辑
};

// 使用较短的 debounce 延迟，提高响应性
const saveAnnotations = debounce(saveAnnotationsImmediate, 300);
```

### 2. 改进节点更新处理

```typescript
const onNodesUpdate = useCallback((nodes: Node<{ annotation: Annotation }>[], bookId: string) => {
  // 设置更新状态
  setIsUpdating(true);
  
  // 清除之前的超时
  if (updateTimeoutRef.current) {
    clearTimeout(updateTimeoutRef.current);
  }
  
  // 使用 debounce 保存（用于连续移动）
  saveAnnotations(nodes, bookId);
  
  // 设置一个超时，在节点停止移动后立即保存
  updateTimeoutRef.current = setTimeout(() => {
    console.log('Nodes stopped moving, saving immediately');
    saveAnnotationsImmediate(nodes, bookId);
    setIsUpdating(false);
  }, 500); // 500ms 后认为节点停止移动
}, [bookId]);
```

### 3. 改进数据库操作

- **增强错误日志**: 添加详细的日志记录，便于调试
- **改进验证逻辑**: 过滤掉不存在的注释，只保存有效的卡片
- **添加重试机制**: 当注释不存在时，自动重试最多3次，每次间隔500ms
- **添加保存验证**: 在保存完成后验证所有卡片是否都被正确保存

```typescript
// 添加重试机制
if (missingAnnotations.length > 0) {
  console.warn('Some annotations are missing from database:', missingAnnotations);
  
  // 如果是重试，等待一段时间后再试
  if (retryCount < 3) {
    console.log(`Retrying in 500ms (attempt ${retryCount + 1}/3)...`);
    setTimeout(() => {
      saveAnnotationsImmediate(newNodes, bookId, retryCount + 1);
    }, 500);
    return;
  }
  
  // 过滤掉不存在的注释，只保存有效的卡片
  const validNodes = newNodes.filter(node => {
    const annotationId = node.id.replace('card-', '');
    return existingAnnotationIds.has(annotationId);
  });
  
  if (validNodes.length === 0) {
    console.warn('No valid annotations to save cards for');
    return;
  }
  
  // 使用有效的节点继续处理
  newNodes = validNodes;
  console.log('Filtered to valid nodes:', validNodes.length);
}

// 验证保存结果
console.log('Verifying saved cards...');
const savedCards = await electron.db.getCardsByAnnotationIds(annotationIds);
console.log('Cards in database after save:', savedCards);

// 检查是否有卡片没有被保存
const savedAnnotationIds = new Set(savedCards.map((card: any) => card.annotationId));
const missingCards = annotationIds.filter(id => !savedAnnotationIds.has(id));

if (missingCards.length > 0) {
  console.warn('Some cards were not saved:', missingCards);
} else {
  console.log('All cards were successfully saved');
}
```

### 4. 改进 batchUpdateCards 函数

- **增强日志记录**: 记录每个卡片的更新/插入操作
- **改进错误处理**: 提供更详细的错误信息
- **保持事务完整性**: 确保所有有效的卡片都被处理

```typescript
if (existingCard) {
  // 更新现有卡片
  const result = updateStmt.run(
    card.position?.x || 0,
    card.position?.y || 0,
    card.width || 200,
    card.height || 120,
    Date.now(),
    card.annotationId
  );
  console.log(`Updated card for annotation ${card.annotationId}, changes: ${result.changes}`);
} else {
  // 插入新卡片
  const result = insertStmt.run(
    card.id,
    card.annotationId,
    card.position?.x || 0,
    card.position?.y || 0,
    card.width || 200,
    card.height || 120,
    Date.now(),
    Date.now()
  );
  console.log(`Inserted new card for annotation ${card.annotationId}, changes: ${result.changes}`);
}
```

## 修复效果

修复后，卡片位置保存将具有以下特性：

1. **响应性提高**: 300ms 的 debounce 延迟提供更好的用户体验
2. **可靠性增强**: 500ms 后的立即保存确保最终位置被保存
3. **完整性保证**: 所有有效的卡片位置都会被保存到数据库
4. **调试友好**: 详细的日志记录便于问题诊断
5. **错误恢复**: 改进的错误处理确保部分失败不会影响整体保存

## 测试验证

1. **连续移动测试**: 快速连续移动多个卡片，确认所有位置都被保存
2. **停止移动测试**: 移动卡片后停止 500ms，确认位置被立即保存
3. **多卡片测试**: 同时移动多个卡片，确认所有卡片的位置都被保存
4. **重启验证**: 重启应用后，确认所有卡片位置都被正确恢复
5. **错误处理测试**: 在有无效注释的情况下，确认有效的卡片仍然被保存

## 相关文件

- `src/components/NotesView.tsx`: 修改保存策略和节点更新处理
- `src/main/db/card.ts`: 改进 batchUpdateCards 函数
- `src/components/note/NoteFlow.tsx`: 节点更新回调处理
