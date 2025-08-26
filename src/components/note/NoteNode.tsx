import React, { useEffect, useRef } from "react";
import { Annotation } from "@/types";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import { AnnotationColor } from "@/const/annotation-color";



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
          className="flex justify-between items-center p-2 px-3 text-xs"
          style={{ 
            backgroundColor: annotationColor,
            borderBottom: `2px solid ${annotationColor}`
          }}
        >
          <span className="font-semibold text-gray-700">Note</span>
          <span className="text-gray-500 text-xs">
            {new Date(annotation.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => onCardClick(annotation)}>
          <div className="text-xs text-gray-500 italic mb-2 leading-relaxed">
            "{annotation.text.substring(0, 50)}..."
          </div>
          <div className="text-sm text-gray-800 leading-relaxed">
            {annotation.note}
          </div>
        </div>
        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} />

      </div>
    );
  };

  export default NoteNode;