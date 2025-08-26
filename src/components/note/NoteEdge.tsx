import React, { useState, useCallback, useRef, useEffect } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps } from '@xyflow/react';


interface NoteEdgeData {
  description?: string;
  [key: string]: unknown;
}

export default function NoteEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
  } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState((data as NoteEdgeData)?.description || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // 当外部数据更新时，同步本地状态
  // useEffect(() => {
  //   setDescription((data as NoteEdgeData)?.description || '');
  // }, [(data as NoteEdgeData)?.description]);
  console.log('description', description)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(event.target.value);
  }, []);



  const handleSave = useCallback(() => {
    setIsEditing(false);
    // 这里需要调用更新连接的函数
    // 可以通过事件或者回调函数来实现
    if (description !== (data as NoteEdgeData)?.description) {
      // 触发更新事件
      const customEvent = new CustomEvent('edge-description-update', {
        detail: { edgeId: id, description }
      });
      window.dispatchEvent(customEvent);
    }
  }, [id, description, (data as NoteEdgeData)?.description]);

  const handleInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      setIsEditing(false);
      setDescription((data as NoteEdgeData)?.description || '');
    }
  }, [(data as NoteEdgeData)?.description, handleSave]);

  const handleInputBlur = useCallback(() => {
    handleSave();
  }, [handleSave]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className={`absolute text-xs pointer-events-all cursor-pointer bg-white p-0.5 px-1.5 rounded border border-gray-300 min-w-5 text-center select-none shadow-sm transition-all duration-200 hover:bg-gray-50 hover:border-blue-500 hover:shadow-md ${
            isEditing ? 'bg-white border-blue-500 shadow-[0_0_0_2px_rgba(0,123,255,0.25)]' : ''
          }`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            opacity: description || isEditing ? 1 : 0.3, // 没有描述时降低透明度
          }}
          onDoubleClick={handleDoubleClick}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={description}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              className="border-none outline-none text-xs w-full min-w-15 text-center bg-transparent"
              placeholder="输入描述..."
            />
          ) : (
            <span className={`${!description ? 'text-gray-400 italic' : 'text-gray-800'}`}>
              {description || '双击编辑'}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
