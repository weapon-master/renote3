# 注释颜色一致性修复总结

## 问题描述
注释颜色在阅读器中显示的颜色与数据库中存储的颜色以及笔记卡片中显示的颜色不一致。

## 根本原因分析

### 1. 数据库默认颜色不一致
- **位置**: `src/main/db/annotation.ts` 第21行
- **问题**: 当 `color_rgba` 为空时，默认值为 `'rgba(255, 255, 0, 0.3)'`
- **期望**: 应该与 `AnnotationColor.HighlightYellow` 的值 `'rgba(255, 255, 0, 0.4)'` 一致

### 2. 笔记卡片默认颜色不一致
- **位置**: `src/components/note/NoteNode.tsx` 第22-24行
- **问题**: 当注释没有颜色时，默认使用 `'#f8f9fa'`（浅灰色）
- **期望**: 应该使用 `AnnotationColor.HighlightYellow` 保持一致性

### 3. 主题设置覆盖注释颜色
- **位置**: `src/components/EpubReader.tsx` 第118-145行
- **问题**: 主题设置中硬编码了 `backgroundColor: 'rgba(0, 123, 255, 0.3)'`，会覆盖注释的实际颜色
- **期望**: 移除硬编码的背景色，让注释的实际颜色生效

## 修复内容

### 1. 修复数据库默认颜色
```typescript
// 修复前
rgba: ann.color_rgba || 'rgba(255, 255, 0, 0.3)',

// 修复后
rgba: ann.color_rgba || 'rgba(255, 255, 0, 0.4)',
```

### 2. 修复笔记卡片默认颜色
```typescript
// 修复前
backgroundColor: annotation.color?.rgba || '#f8f9fa',
borderBottom: `2px solid ${annotation.color?.rgba || '#e9ecef'}`

// 修复后
backgroundColor: annotation.color?.rgba || AnnotationColor.HighlightYellow,
borderBottom: `2px solid ${annotation.color?.rgba || AnnotationColor.HighlightYellow}`
```

### 3. 移除主题设置中的硬编码背景色
```typescript
// 修复前
'.epubjs-hl': { 
  pointerEvents: 'auto',
  backgroundColor: 'rgba(0, 123, 255, 0.3)',  // 硬编码的蓝色
  zIndex: '1',
  // ...
}

// 修复后
'.epubjs-hl': { 
  pointerEvents: 'auto',
  zIndex: '1',
  // 移除硬编码背景色，让注释的实际颜色生效
  // ...
}
```

## 修复效果

修复后，注释颜色在整个应用中保持一致：

1. **阅读器中的高亮**: 使用注释的实际颜色或默认的黄色高亮
2. **笔记卡片**: 使用相同的颜色作为背景和边框
3. **数据库存储**: 默认颜色与常量定义保持一致

## 验证方法

1. 创建一个新的注释，不选择特定颜色（使用默认黄色）
2. 检查阅读器中的高亮颜色
3. 检查笔记卡片中的背景颜色
4. 检查数据库中存储的颜色值
5. 所有地方应该显示相同的黄色 `rgba(255, 255, 0, 0.4)`

## 相关文件

- `src/main/db/annotation.ts` - 数据库读取逻辑
- `src/components/note/NoteNode.tsx` - 笔记卡片组件
- `src/components/EpubReader.tsx` - 阅读器组件
- `src/const/annotation-color.ts` - 颜色常量定义
