import React, { useEffect, useRef } from "react";
import { Annotation } from "@/types";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import { AnnotationColor } from "@/const/annotation-color";
import './NoteNode.css'


const NoteNode: React.FC<{
    data: {
      annotation: Annotation;
      onCardClick: (annotation: Annotation) => void;
      highlight: boolean
    };
    id: string;
  }> = ({ data, id }) => {
    const { annotation, onCardClick } = data;
  
    const annotationColor = annotation.color?.rgba || AnnotationColor.HighlightYellow;
    const ref = useRef<HTMLDivElement>(null);
    const updateNodeInternals = useUpdateNodeInternals();
    useEffect(() => {
      updateNodeInternals(id);
    }, [id, updateNodeInternals]);
    return (
      <div ref={ref} style={{
        backgroundColor: data.highlight ? annotationColor : '',
        height: 'auto',
      }}>
        <div 
          className="node-header"
          style={{ 
            backgroundColor: annotationColor,
            borderBottom: `2px solid ${annotationColor}`
          }}
        >
          <span className="node-title">Note</span>
          <span className="node-date">
            {new Date(annotation.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="node-content" onClick={() => onCardClick(annotation)}>
          <div className="selected-text">
            "{annotation.text.substring(0, 50)}..."
          </div>
          <div className="note-text">
            {annotation.note}
          </div>
        </div>
        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} />

      </div>
    );
  };

  export default NoteNode;