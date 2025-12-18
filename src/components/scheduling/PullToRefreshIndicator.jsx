import React from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefreshIndicator({ onRefresh, children }) {
  const [{ y, rotate, opacity }, api] = useSpring(() => ({
    y: 0,
    rotate: 0,
    opacity: 0,
    config: { tension: 300, friction: 30 }
  }));

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const bind = useDrag(
    async ({ down, movement: [, my], velocity: [, vy], direction: [, dy] }) => {
      // Only allow pull down at the top of the page
      if (window.scrollY > 0) return;

      const pullDistance = Math.max(0, my);
      const threshold = 80;

      if (down && dy > 0) {
        // User is pulling down
        api.start({
          y: Math.min(pullDistance, threshold * 1.5),
          rotate: (pullDistance / threshold) * 360,
          opacity: Math.min(pullDistance / threshold, 1),
          immediate: true
        });
      } else {
        // User released
        if (pullDistance > threshold && !isRefreshing) {
          // Trigger refresh
          setIsRefreshing(true);
          api.start({
            y: threshold,
            rotate: 360,
            opacity: 1
          });

          await onRefresh?.();

          // Reset after refresh
          setTimeout(() => {
            api.start({
              y: 0,
              rotate: 0,
              opacity: 0
            });
            setIsRefreshing(false);
          }, 500);
        } else {
          // Reset without refresh
          api.start({
            y: 0,
            rotate: 0,
            opacity: 0,
            config: { 
              tension: 200, 
              friction: 25,
              velocity: [0, -vy * 0.5]
            }
          });
        }
      }
    },
    {
      axis: 'y',
      filterTaps: true,
      bounds: { top: 0 },
      rubberband: true
    }
  );

  return (
    <div className="relative" {...bind()} style={{ touchAction: 'pan-y' }}>
      <animated.div
        style={{
          y,
          opacity,
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50
        }}
        className="bg-white rounded-full p-3 shadow-lg"
      >
        <animated.div style={{ rotate }}>
          <RefreshCw className="h-6 w-6 text-blue-600" />
        </animated.div>
      </animated.div>
      {children}
    </div>
  );
}