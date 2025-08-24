import React, { useState, useCallback, useRef, useEffect } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps, Edge } from '@xyflow/react';
import './NoteEdge.css';

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
          className={`note-edge-label ${isEditing ? 'editing' : ''}`}
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
              className="note-edge-input"
              placeholder="输入描述..."
            />
          ) : (
            <span className={`note-edge-text ${!description ? 'empty' : ''}`}>
              {description || '双击编辑'}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
