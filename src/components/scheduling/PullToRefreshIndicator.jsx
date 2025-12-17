import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function PullToRefreshIndicator({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const rotate = useTransform(y, [0, 100], [0, 360]);
  const opacity = useTransform(y, [0, 50, 80], [0, 0.5, 1]);
  const startY = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      if (window.scrollY <= 5) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (startY.current > 0 && window.scrollY <= 5) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;
        if (diff > 0) {
          y.set(Math.min(diff * 0.4, 150)); // Add resistance
        }
      }
    };

    const handleTouchEnd = async () => {
      if (startY.current > 0) {
        const finalY = y.get();
        if (finalY > 80 && !isRefreshing) {
          setIsRefreshing(true);
          animate(y, 80); // Snap to loading
          if (onRefresh) await onRefresh();
          setIsRefreshing(false);
          animate(y, 0);
        } else {
          animate(y, 0);
        }
        startY.current = 0;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing, onRefresh, y]);

  return (
    <div ref={containerRef} className="relative min-h-screen">
      <motion.div
        style={{ y, opacity, pointerEvents: 'none' }}
        className="fixed top-20 left-0 right-0 flex justify-center z-50"
      >
        <motion.div 
          style={{ rotate }}
          className="bg-white rounded-full p-2 shadow-lg border"
        >
          {isRefreshing ? (
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          ) : (
            <Loader2 className="w-6 h-6 text-blue-600" />
          )}
        </motion.div>
      </motion.div>
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}