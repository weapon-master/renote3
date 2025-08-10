# 高亮颜色逐渐加深问题修复总结

## 问题描述
在反复点击note卡片时，reader中的高亮颜色会逐渐加深，直至完全遮挡文字，影响阅读体验。

## 问题原因
1. 每次点击note卡片时，`navigateToAnnotation`函数都会添加新的高亮
2. 旧的高亮没有被正确清理，导致多个高亮层叠加
3. 使用相同的高亮类型（'highlight'）导致epub.js无法区分临时高亮和永久高亮

## 解决方案

### 1. 使用标准高亮类型
- 继续使用标准的 `'highlight'` 类型，确保epub.js兼容性
- 通过状态管理避免高亮叠加问题

### 2. 添加状态管理
- 添加 `currentTempHighlight` 状态来跟踪当前的临时高亮
- 在添加新高亮之前，先清理旧的临时高亮

### 3. 改进高亮策略
- 临时高亮时先移除所有现有高亮
- 添加黄色临时高亮（2秒后自动消失）
- 临时高亮消失后自动恢复蓝色永久高亮

### 4. 完善清理机制
- 在页面切换时自动清理临时高亮并恢复永久高亮
- 在2秒后自动移除临时高亮并恢复永久高亮
- 确保在组件卸载时清理所有临时高亮

## 修改的文件
- `src/components/EpubReader.tsx`

## 主要修改内容

### 1. 添加状态变量
```typescript
const [currentTempHighlight, setCurrentTempHighlight] = useState<string | null>(null);
```

### 2. 修改navigateToAnnotation函数
```typescript
// 先移除所有现有高亮
renditionRef.current.annotations.remove(annotation.cfiRange, 'highlight');

// 添加临时高亮
renditionRef.current.annotations.add('highlight', annotation.cfiRange, {
  'background-color': 'rgba(255, 193, 7, 0.4)',
  'border': '2px solid rgba(255, 193, 7, 0.8)'
});

// 2秒后恢复永久高亮
setTimeout(() => {
  renditionRef.current?.annotations.remove(annotation.cfiRange, 'highlight');
  // 重新添加永久高亮
  renditionRef.current?.annotations.add('highlight', annotation.cfiRange, {
    'background-color': 'rgba(0, 123, 255, 0.3)',
    'border': '1px solid rgba(0, 123, 255, 0.6)'
  });
}, 2000);
```

### 3. 页面切换时清理
```typescript
rendition.on('relocated', () => {
  // 移除临时高亮并恢复永久高亮
  if (currentTempHighlight && renditionRef.current) {
    renditionRef.current.annotations.remove(currentTempHighlight, 'highlight');
    setCurrentTempHighlight(null);
    
    // 重新应用所有永久高亮
    setTimeout(() => {
      if (renditionRef.current) {
        applyHighlights(renditionRef.current, annotations);
      }
    }, 100);
  }
});
```

## 测试建议
1. 打开一个包含多个批注的EPUB文件
2. 反复点击不同的note卡片
3. 验证高亮不会叠加，每次只显示一个临时高亮
4. 确认2秒后临时高亮自动消失
5. 验证页面切换时临时高亮被正确清理

## 效果
- 解决了高亮颜色逐渐加深的问题
- 提供了清晰的视觉反馈，区分临时高亮和永久高亮
- 改善了用户体验，避免了文字被遮挡的问题
