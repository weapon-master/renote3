# 新注释卡片创建修复

## 问题描述

当创建新注释时，新卡片没有被创建在笔记视图中。虽然注释成功保存到数据库，但对应的卡片没有出现在笔记视图中。

## 根本原因

1. **缺少卡片创建逻辑**: 在 `EpubReader.tsx` 中创建新注释时，只调用了 `createAnnotation` 函数来保存注释到数据库，但没有同时创建对应的卡片记录。

2. **数据库依赖关系**: 卡片表 (`cards`) 通过外键关联到注释表 (`annotations`)，每个注释都应该有一个对应的卡片记录来存储其视觉属性（位置、尺寸等）。

3. **NotesView 组件逻辑**: `NotesView` 组件通过 `loadCardsAndInitializeNodes` 函数从数据库加载卡片数据来创建节点，但对于新创建的注释，数据库中还没有对应的卡片记录。

4. **时序问题**: 当新注释被创建时，`annotations` 数组会立即更新，这会触发 NotesView 重新加载卡片。但是，卡片创建是异步的，可能在 NotesView 重新加载时还没有完成。

5. **循环依赖问题**: `loadCardsAndInitializeNodes` 函数依赖于 `annotations`，而 `useEffect` 又依赖于 `loadCardsAndInitializeNodes`，导致循环依赖。

## 修复方案

### 1. 修改 `EpubReader.tsx` 中的注释创建逻辑

在创建新注释后，同时创建对应的默认卡片：

```typescript
// 在 createAnnotation 调用后添加卡片创建逻辑
const savedAnnotation = await window.electron?.db?.createAnnotation?.(book.id, newAnnotation);

// Create a default card for the new annotation
if (savedAnnotation) {
  try {
    const defaultCard = {
      annotationId: savedAnnotation.id,
      position: { x: 50 + annotations.length * 200, y: 50 + annotations.length * 150 },
      width: 200,
      height: 120,
    };
    console.log('Creating default card for new annotation:', savedAnnotation.id);
    await window.electron?.db?.createCard?.(savedAnnotation.id, defaultCard);
  } catch (cardError) {
    console.error('创建注释卡片失败', cardError);
  }
}
```

### 2. 修复时序问题

确保在数据库操作（注释和卡片创建）完成后再更新本地状态，避免 NotesView 在卡片创建完成前就重新加载：

```typescript
// 先执行数据库操作
await window.electron?.db?.createAnnotation?.(book.id, newAnnotation);
await window.electron?.db?.createCard?.(savedAnnotation.id, defaultCard);

// 然后更新本地状态
setAnnotations(next);
```

### 3. 修复循环依赖问题

移除 `loadCardsAndInitializeNodes` 函数对 `annotations` 的依赖，避免循环依赖：

```typescript
// 移除 annotations 依赖，避免循环
const loadCardsAndInitializeNodes = useCallback(async () => {
  // 函数内部直接使用当前的 annotations 状态
  // ...
}, [onCardClick]); // 只依赖 onCardClick

// 在 useEffect 中移除 loadCardsAndInitializeNodes 依赖
useEffect(() => {
  if (annotations.length > 0) {
    loadCardsAndInitializeNodes();
  } else {
    setInitialNodes([]);
  }
}, [annotations]); // 只依赖 annotations
```

### 4. 确保类型安全

修复了 `createCard` 函数调用时的类型错误，确保传递正确的 `annotationId` 字段。

### 5. 错误处理

添加了适当的错误处理，确保即使卡片创建失败，也不会影响注释的创建。

## 修复效果

修复后，当用户创建新注释时：

1. **注释保存**: 注释成功保存到数据库
2. **卡片创建**: 自动创建对应的默认卡片，包含默认位置和尺寸
3. **视图更新**: `NotesView` 组件能够正确加载新创建的卡片并显示在笔记视图中
4. **位置计算**: 新卡片的位置基于现有注释数量进行合理分布
5. **时序正确**: 确保卡片创建完成后再更新视图
6. **无循环依赖**: 避免了组件间的循环依赖问题

## 测试验证

1. 在 EPUB 阅读器中创建新注释
2. 检查数据库中是否同时创建了注释和卡片记录
3. 验证笔记视图中是否正确显示新创建的卡片
4. 确认卡片位置和尺寸是否符合预期

## 相关文件

- `src/components/EpubReader.tsx`: 修改注释创建逻辑和时序
- `src/components/NotesView.tsx`: 修复循环依赖问题
- `src/main/db/card.ts`: 卡片数据库操作
- `src/main/db/annotation.ts`: 注释数据库操作
