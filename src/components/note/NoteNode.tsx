import React from "react";
import { Annotation } from "@/types";
import { Handle, Position } from "@xyflow/react";
import { AnnotationColor } from "@/const/annotation-color";



const NoteNode: React.FC<{
    data: {
      annotation: Annotation;
      onCardClick: (annotation: Annotation) => void;
    };
    id: string;
  }> = ({ data, id }) => {
    const { annotation, onCardClick } = data;
  

  
    return (
      <div>
        <div 
          className="node-header"
          style={{ 
            backgroundColor: annotation.color?.rgba || AnnotationColor.HighlightYellow,
            borderBottom: `2px solid ${annotation.color?.rgba || AnnotationColor.HighlightYellow}`
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