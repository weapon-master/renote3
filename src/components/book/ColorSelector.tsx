import React from 'react';
import { Card, CardBody, Tooltip } from '@heroui/react';
import { CiCircleCheck } from 'react-icons/ci';
import { AnnotationColor } from '@/const/annotation-color';

interface ColorPaletteProps {
  onColorSelect: (color: string) => void;
  selectedColor: string;
}

export default function ColorPalette({
  onColorSelect,
  selectedColor,
}: ColorPaletteProps) {
  return (
    <Card className="max-w-md mx-auto shadow-lg">
      <CardBody>
        <div className="flex justify-center gap-4 flex-wrap">
          {Object.entries(AnnotationColor).map(([name, color]) => (
            <Tooltip content={name} key={name}>
                <button
                key={color}
                onClick={() => {
                    onColorSelect(color);
                }}
                className={`w-6 h-6 rounded-full border-1 flex items-center justify-center transition-all duration-200 ${
                    selectedColor === color
                    ? 'scale-110 border-gray-900 shadow-md'
                    : 'border-gray-300 hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                >
                {selectedColor === color && (
                    <CiCircleCheck
                    className="text-black drop-shadow-md"
                    size={20}
                    />
                )}
                </button>
            </Tooltip>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
