import React, { useEffect, useRef, useState } from 'react';

interface TripleHandleSliderProps {
    min: number;
    mode: number;
    max: number;
    minBound?: number;
    maxBound?: number;
    disabled?: boolean;
    color?: 'blue' | 'green';
    onChange: (values: { min: number; mode: number; max: number }) => void;
    yieldValue?: number;
}

export const TripleHandleSlider: React.FC<TripleHandleSliderProps> = ({
    min,
    mode,
    max,
    minBound = 0,
    maxBound = 100,
    disabled = false,
    color = 'blue',
    onChange,
    yieldValue
}) => {
    const sliderRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState<'min' | 'mode' | 'max' | null>(null);
    
    const colorClasses = {
        blue: {
            track: 'bg-blue-200',
            range: 'bg-blue-400',
            handle: 'bg-blue-600 hover:bg-blue-700 border-blue-700',
            text: 'text-blue-600'
        },
        green: {
            track: 'bg-green-200',
            range: 'bg-green-400',
            handle: 'bg-green-600 hover:bg-green-700 border-green-700',
            text: 'text-green-600'
        }
    };

    const colors = colorClasses[color];

    const valueToPercent = (value: number) => {
        return ((value - minBound) / (maxBound - minBound)) * 100;
    };

    const percentToValue = (percent: number) => {
        return Math.round(minBound + (percent / 100) * (maxBound - minBound));
    };

    const handleMouseDown = (handle: 'min' | 'mode' | 'max') => (e: React.MouseEvent) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(handle);
    };

    const handleMove = (clientX: number) => {
        if (!sliderRef.current || !dragging) return;

        const rect = sliderRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const newValue = percentToValue(percent);

        let newMin = min;
        let newMode = mode;
        let newMax = max;

        if (dragging === 'min') {
            newMin = Math.max(minBound, Math.min(newValue, mode));
        } else if (dragging === 'mode') {
            newMode = Math.max(min, Math.min(newValue, max));
        } else if (dragging === 'max') {
            newMax = Math.min(maxBound, Math.max(newValue, mode));
        }

        if (newMin !== min || newMode !== mode || newMax !== max) {
            onChange({ min: newMin, mode: newMode, max: newMax });
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (dragging) {
                handleMove(e.clientX);
            }
        };

        const handleMouseUp = () => {
            setDragging(null);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (dragging && e.touches[0]) {
                e.preventDefault();
                handleMove(e.touches[0].clientX);
            }
        };

        const handleTouchEnd = () => {
            setDragging(null);
        };

        if (dragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [dragging, min, mode, max, minBound, maxBound]);

    const calculateYieldImpact = (lossPercentage: number, baselineYield: number): number => {
        return baselineYield * (1 - lossPercentage / 100);
    };

    return (
        <div className="space-y-2">
            {/* Slider track */}
            <div
                ref={sliderRef}
                className={`relative h-2 rounded-full ${colors.track} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                {/* Highlighted range between min and max */}
                <div
                    className={`absolute h-full rounded-full ${colors.range}`}
                    style={{
                        left: `${valueToPercent(min)}%`,
                        width: `${valueToPercent(max) - valueToPercent(min)}%`
                    }}
                />

                {/* Min handle */}
                <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${colors.handle} border-2 cursor-grab active:cursor-grabbing shadow-md ${dragging === 'min' ? 'ring-2 ring-offset-2 ring-current scale-110' : ''} ${disabled ? 'cursor-not-allowed' : ''}`}
                    style={{ left: `${valueToPercent(min)}%` }}
                    onMouseDown={handleMouseDown('min')}
                    onTouchStart={(e) => {
                        if (!disabled) {
                            e.preventDefault();
                            setDragging('min');
                        }
                    }}
                />

                {/* Mode handle */}
                <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full ${colors.handle} border-2 cursor-grab active:cursor-grabbing shadow-md ${dragging === 'mode' ? 'ring-2 ring-offset-2 ring-current scale-110' : ''} ${disabled ? 'cursor-not-allowed' : ''}`}
                    style={{ left: `${valueToPercent(mode)}%` }}
                    onMouseDown={handleMouseDown('mode')}
                    onTouchStart={(e) => {
                        if (!disabled) {
                            e.preventDefault();
                            setDragging('mode');
                        }
                    }}
                />

                {/* Max handle */}
                <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${colors.handle} border-2 cursor-grab active:cursor-grabbing shadow-md ${dragging === 'max' ? 'ring-2 ring-offset-2 ring-current scale-110' : ''} ${disabled ? 'cursor-not-allowed' : ''}`}
                    style={{ left: `${valueToPercent(max)}%` }}
                    onMouseDown={handleMouseDown('max')}
                    onTouchStart={(e) => {
                        if (!disabled) {
                            e.preventDefault();
                            setDragging('max');
                        }
                    }}
                />
            </div>

            {/* Value labels */}
            <div className="flex justify-between items-center text-xs">
                <div className="flex flex-col items-start">
                    <span className="text-gray-500 uppercase">Min</span>
                    <span className={`font-medium ${colors.text}`}>{min}%</span>
                    {yieldValue && (
                        <span className={`text-xs ${colors.text} opacity-75`}>
                            {calculateYieldImpact(min, yieldValue).toFixed(1)}t
                        </span>
                    )}
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-gray-500 uppercase">Mode</span>
                    <span className={`font-medium ${colors.text}`}>{mode}%</span>
                    {yieldValue && (
                        <span className={`text-xs ${colors.text} opacity-75`}>
                            {calculateYieldImpact(mode, yieldValue).toFixed(1)}t
                        </span>
                    )}
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-gray-500 uppercase">Max</span>
                    <span className={`font-medium ${colors.text}`}>{max}%</span>
                    {yieldValue && (
                        <span className={`text-xs ${colors.text} opacity-75`}>
                            {calculateYieldImpact(max, yieldValue).toFixed(1)}t
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
