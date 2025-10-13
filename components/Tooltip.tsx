import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    text: string | null;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    if (!text) {
        // If no tooltip text, just return the children without tooltip functionality
        return <>{children}</>;
    }

    const updateTooltipPosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Estimate tooltip dimensions (will be refined after render)
            const tooltipWidth = 300; // max-w-xs is roughly 300px
            const tooltipHeight = 60; // Rough estimate for typical tooltip height
            
            // For fixed positioning, use viewport coordinates directly
            let x = rect.left;
            let y = rect.top;
            
            // Adjust position based on desired tooltip position
            switch (position) {
                case 'top':
                    x += rect.width / 2;
                    y -= 8; // Small offset above the trigger
                    break;
                case 'bottom':
                    x += rect.width / 2;
                    y += rect.height + 8; // Small offset below the trigger
                    break;
                case 'left':
                    x -= 8; // Small offset to the left
                    y += rect.height / 2;
                    break;
                case 'right':
                    x += rect.width + 8; // Small offset to the right
                    y += rect.height / 2;
                    break;
            }
            
            // Viewport boundary detection and adjustment
            // Check horizontal boundaries
            if (position === 'top' || position === 'bottom') {
                // Centered tooltips - check if they extend beyond viewport
                const tooltipLeft = x - tooltipWidth / 2;
                const tooltipRight = x + tooltipWidth / 2;
                
                if (tooltipLeft < 10) {
                    // Too far left, align to left edge with padding
                    x = tooltipWidth / 2 + 10;
                } else if (tooltipRight > viewportWidth - 10) {
                    // Too far right, align to right edge with padding
                    x = viewportWidth - tooltipWidth / 2 - 10;
                }
            } else {
                // Side tooltips - check if they extend beyond viewport
                if (position === 'left') {
                    if (x - tooltipWidth < 10) {
                        // Switch to right side if left doesn't fit
                        x = rect.right + 8;
                    }
                } else if (position === 'right') {
                    if (x + tooltipWidth > viewportWidth - 10) {
                        // Switch to left side if right doesn't fit
                        x = rect.left - 8;
                    }
                }
            }
            
            // Check vertical boundaries
            if (position === 'top') {
                if (y - tooltipHeight < 10) {
                    // Not enough space above, switch to bottom
                    y = rect.bottom + 8;
                }
            } else if (position === 'bottom') {
                if (y + tooltipHeight > viewportHeight - 10) {
                    // Not enough space below, switch to top
                    y = rect.top - 8;
                }
            } else {
                // Side tooltips - keep vertically centered but check bounds
                const tooltipTop = y - tooltipHeight / 2;
                const tooltipBottom = y + tooltipHeight / 2;
                
                if (tooltipTop < 10) {
                    y = tooltipHeight / 2 + 10;
                } else if (tooltipBottom > viewportHeight - 10) {
                    y = viewportHeight - tooltipHeight / 2 - 10;
                }
            }
            
            setTooltipPosition({ x, y });
        }
    };

    const handleMouseEnter = () => {
        updateTooltipPosition();
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    useEffect(() => {
        if (isVisible) {
            const handleScroll = () => updateTooltipPosition();
            const handleResize = () => updateTooltipPosition();
            
            window.addEventListener('scroll', handleScroll);
            window.addEventListener('resize', handleResize);
            
            return () => {
                window.removeEventListener('scroll', handleScroll);
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [isVisible]);

    const getTooltipClasses = () => {
        const baseClasses = 'fixed z-[9999] bg-gray-800 text-white text-sm rounded-md px-3 py-2 max-w-xs shadow-lg pointer-events-none';
        
        switch (position) {
            case 'top':
                return `${baseClasses} transform -translate-x-1/2 -translate-y-full`;
            case 'bottom':
                return `${baseClasses} transform -translate-x-1/2`;
            case 'left':
                return `${baseClasses} transform -translate-x-full -translate-y-1/2`;
            case 'right':
                return `${baseClasses} transform -translate-y-1/2`;
            default:
                return `${baseClasses} transform -translate-x-1/2 -translate-y-full`;
        }
    };

    const getArrowClasses = () => {
        const baseArrowClasses = 'absolute w-0 h-0 border-4';
        
        switch (position) {
            case 'top':
                return `${baseArrowClasses} top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800`;
            case 'bottom':
                return `${baseArrowClasses} bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800`;
            case 'left':
                return `${baseArrowClasses} left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800`;
            case 'right':
                return `${baseArrowClasses} right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800`;
            default:
                return `${baseArrowClasses} top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800`;
        }
    };

    return (
        <>
            <div 
                ref={triggerRef}
                className="inline-block"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </div>
            {isVisible && createPortal(
                <div
                    className={getTooltipClasses()}
                    style={{
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                    }}
                >
                    {text}
                    <div className={getArrowClasses()}></div>
                </div>,
                document.body
            )}
        </>
    );
};