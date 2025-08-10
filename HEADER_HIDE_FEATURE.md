# Header 隐藏功能

## 功能描述

Reader组件的header现在默认隐藏，只有在鼠标悬浮在reader顶部时才会显示。这个功能旨在为Reader和Notes视图节省更多空间。

## 实现细节

### React组件修改 (Reader.tsx)

1. **状态管理**: 添加了 `showHeader` 状态来控制header的显示/隐藏
2. **事件处理**: 添加了 `handleMouseEnter` 和 `handleMouseLeave` 事件处理器
3. **条件渲染**: 所有返回的JSX都添加了鼠标悬浮事件和动态CSS类

### CSS样式修改 (Reader.css)

1. **绝对定位**: header使用绝对定位，不占用文档流空间
2. **动画效果**: 使用 `transform: translateY()` 实现平滑的显示/隐藏动画
3. **视觉提示**: 添加了顶部小指示器，当鼠标悬浮时显示
4. **阴影效果**: 为header添加了阴影，增强视觉层次

## 功能特点

- ✅ 默认隐藏header，节省阅读空间
- ✅ 鼠标悬浮时平滑显示header
- ✅ 鼠标离开时自动隐藏header
- ✅ 平滑的动画过渡效果
- ✅ 顶部小指示器提示用户
- ✅ 保持所有原有功能（返回按钮、笔记切换等）

## 使用方法

1. 进入Reader页面
2. Header默认隐藏，可以看到更多的阅读内容
3. 将鼠标移动到页面顶部，header会平滑显示
4. 移开鼠标，header会再次隐藏

## 技术实现

```typescript
// 状态管理
const [showHeader, setShowHeader] = useState(false);

// 事件处理
const handleMouseEnter = () => setShowHeader(true);
const handleMouseLeave = () => setShowHeader(false);

// CSS类动态切换
className={`reader-header ${showHeader ? 'show' : 'hide'}`}
```

```css
/* 动画效果 */
.reader-header.hide {
  transform: translateY(-100%);
}

.reader-header.show {
  transform: translateY(0);
}
```
