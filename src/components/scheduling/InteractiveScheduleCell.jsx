import React from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useHover, useLongPress } from '@use-gesture/react';
import { Plus } from 'lucide-react';

export default function InteractiveScheduleCell({ 
  truckId, 
  timeSlotId, 
  slotPosition,
  onAddPlaceholder,
  children,
  isEmpty = false
}) {
  const [{ scale, backgroundColor, borderColor }, api] = useSpring(() => ({
    scale: 1,
    backgroundColor: 'rgba(249, 250, 251, 0)',
    borderColor: 'rgba(229, 231, 235, 0)',
    config: { tension: 300, friction: 25 }
  }));

  const hoverBind = useHover(({ hovering }) => {
    if (isEmpty) {
      api.start({
        scale: hovering ? 1.02 : 1,
        backgroundColor: hovering ? 'rgba(219, 234, 254, 0.3)' : 'rgba(249, 250, 251, 0)',
        borderColor: hovering ? 'rgba(147, 197, 253, 0.5)' : 'rgba(229, 231, 235, 0)',
      });
    }
  });

  const longPressBind = useLongPress(
    () => {
      if (isEmpty && onAddPlaceholder) {
        onAddPlaceholder(truckId, timeSlotId, slotPosition);
        // Haptic feedback on mobile
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    },
    {
      threshold: 500,
      onCancel: () => {
        api.start({
          scale: 1,
          config: { tension: 400, friction: 30 }
        });
      }
    }
  );

  const handlePress = () => {
    api.start({
      scale: 0.95,
      config: { tension: 400, friction: 30 }
    });
  };

  return (
    <animated.div
      {...hoverBind()}
      {...longPressBind()}
      onMouseDown={handlePress}
      onTouchStart={handlePress}
      style={{
        scale,
        backgroundColor,
        borderColor,
        borderWidth: isEmpty ? 2 : 0,
        borderStyle: 'dashed'
      }}
      className={`rounded-lg transition-all ${isEmpty ? 'cursor-pointer' : ''}`}
    >
      {isEmpty ? (
        <div className="h-full min-h-[80px] flex items-center justify-center">
          <Plus className="h-5 w-5 text-gray-400" />
        </div>
      ) : (
        children
      )}
    </animated.div>
  );
}