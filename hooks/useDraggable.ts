// Simple draggable hook for React components
import React, { useCallback, useRef, useState } from 'react';

interface DragHandlers {
    onMouseDown: (e: React.MouseEvent) => void;
    isDragging: boolean;
}

export const useDraggable = (
    onDrag: (value: number) => void,
    containerRef: React.RefObject<HTMLElement>
): DragHandlers => {
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({ startX: 0, startValue: 0 });

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        
        const container = containerRef.current;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        dragRef.current.startX = e.clientX;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!container) return;
            
            const rect = container.getBoundingClientRect();
            const relativeX = moveEvent.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
            
            onDrag(percentage);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [onDrag, containerRef]);

    return { onMouseDown, isDragging };
};