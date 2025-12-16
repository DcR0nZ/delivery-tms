import React, { useRef } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag, useHover, usePinch } from '@use-gesture/react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, Eye, Calendar } from 'lucide-react';
import { getJobCardInlineStyles, getBadgeStyles, getJobCardStyles } from './DeliveryTypeColorUtils';
import { format } from 'date-fns';

export default function GestureJobCard({ 
  job, 
  deliveryType, 
  pickupLocation, 
  onClick, 
  onDelete,
  showDeleteAction = false,
  className = ''
}) {
  const cardRef = useRef(null);
  const pickupShortname = pickupLocation?.shortname;
  const cardStyles = getJobCardInlineStyles(deliveryType, job);
  const badgeStyles = getBadgeStyles(getJobCardStyles(deliveryType, job));
  const textStyles = getJobCardStyles(deliveryType, job);

  // Spring animation for drag and scale
  const [{ x, y, scale, rotateZ, opacity }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    scale: 1,
    rotateZ: 0,
    opacity: 1,
    config: { tension: 300, friction: 30 }
  }));

  // Drag gesture with momentum
  const bind = useDrag(
    ({ down, movement: [mx, my], velocity: [vx, vy], direction: [dx], cancel, canceled }) => {
      // Swipe to delete on mobile if enabled
      if (showDeleteAction && !down && Math.abs(mx) > 100 && Math.abs(mx) > Math.abs(my)) {
        if (dx > 0) {
          // Swiped right - delete action
          api.start({
            x: window.innerWidth,
            opacity: 0,
            config: { tension: 200, friction: 25 }
          });
          setTimeout(() => onDelete?.(job), 300);
          cancel();
          return;
        }
      }

      // Calculate rotation based on horizontal movement
      const rotationAngle = down ? mx * 0.02 : 0;
      
      api.start({
        x: down ? mx : 0,
        y: down ? my : 0,
        scale: down ? 1.05 : 1,
        rotateZ: rotationAngle,
        opacity: down ? 0.9 : 1,
        immediate: down,
        config: down 
          ? { tension: 800, friction: 50 }
          : { 
              tension: 300, 
              friction: 30,
              velocity: [vx * 0.5, vy * 0.5]
            }
      });
    },
    {
      filterTaps: true,
      axis: showDeleteAction ? 'x' : undefined,
      bounds: showDeleteAction ? { left: 0, right: window.innerWidth } : undefined,
      rubberband: true
    }
  );

  // Hover effect
  const hoverBind = useHover(({ hovering }) => {
    if (!hovering) return;
    api.start({
      scale: hovering ? 1.02 : 1,
      config: { tension: 400, friction: 40 }
    });
  });

  // Pinch gesture for zoom (mobile)
  const pinchBind = usePinch(
    ({ offset: [s] }) => {
      api.start({
        scale: Math.max(0.8, Math.min(1.3, s)),
        config: { tension: 300, friction: 30 }
      });
    },
    { 
      scaleBounds: { min: 0.8, max: 1.3 },
      rubberband: true
    }
  );

  const handleClick = (e) => {
    // Only trigger onClick if the card wasn't dragged
    if (Math.abs(x.get()) < 5 && Math.abs(y.get()) < 5) {
      onClick?.(job);
    }
  };

  return (
    <animated.div
      ref={cardRef}
      {...bind()}
      {...hoverBind()}
      {...pinchBind()}
      onClick={handleClick}
      style={{
        x,
        y,
        scale,
        rotateZ,
        opacity,
        touchAction: 'none',
        cursor: 'grab',
        ...cardStyles
      }}
      className={`p-3 rounded-lg border-2 relative ${className}`}
    >
      {/* Swipe indicator - shows when swiping */}
      {showDeleteAction && (
        <animated.div
          style={{
            opacity: x.to(x => Math.min(Math.abs(x) / 100, 0.8)),
            scale: x.to(x => Math.min(Math.abs(x) / 50, 1.2))
          }}
          className="absolute inset-y-0 left-0 flex items-center justify-center w-16 bg-red-500 rounded-l-lg"
        >
          <Trash2 className="h-5 w-5 text-white" />
        </animated.div>
      )}

      <div className="flex justify-between items-start gap-2 mb-1">
        <div className="flex-1 min-w-0">
          {(deliveryType?.code || pickupShortname) && (
            <div className="mb-1 flex gap-1 flex-wrap">
              {deliveryType?.code && (
                <span 
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 shadow-sm"
                  style={badgeStyles}
                >
                  {textStyles.icon && <span className="text-sm">{textStyles.icon}</span>}
                  {deliveryType.code}
                </span>
              )}
              {pickupShortname && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                  {pickupShortname}
                </span>
              )}
            </div>
          )}
          <span className="font-semibold text-sm text-gray-900 block">{job.customerName}</span>
        </div>
        <div className="flex flex-col gap-1 items-end">
          {job.sqm && (
            <Badge variant="secondary" className="text-[10px] bg-white/90 text-gray-900">
              {job.sqm}m²
            </Badge>
          )}
          {job.isDifficultDelivery && (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          )}
        </div>
      </div>
      <p className="text-sm text-gray-600 truncate">{job.deliveryLocation}</p>
      <p className="text-xs text-gray-500 mt-1">{job.deliveryTypeName}</p>
      {job.requestedDate && (
        <div className="flex items-center gap-1 mt-1">
          <Calendar className="h-3 w-3 text-gray-400" />
          <p className="text-xs text-gray-500">
            {format(new Date(job.requestedDate), 'MMM d')}
          </p>
        </div>
      )}
    </animated.div>
  );
}