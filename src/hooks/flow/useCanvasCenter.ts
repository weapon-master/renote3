import { useReactFlow } from '@xyflow/react';

export default function useCanvasCenter() {
  const { getViewport } = useReactFlow();

  const getCanvasCenter = () => {
    const { x, y, zoom } = getViewport();

    // The size of the DOM container (the viewport element)
    const viewportElement = document.querySelector('.react-flow__viewport')?.parentElement;
    if (!viewportElement) return { x: 0, y: 0 };

    const { clientWidth, clientHeight } = viewportElement;

    // Center in screen coordinates
    const centerScreenX = clientWidth / 2;
    const centerScreenY = clientHeight / 2;

    // Convert back to canvas (graph) coordinates
    const centerCanvasX = (centerScreenX - x) / zoom;
    const centerCanvasY = (centerScreenY - y) / zoom;

    return { x: centerCanvasX, y: centerCanvasY };
  };

  return getCanvasCenter;
}
