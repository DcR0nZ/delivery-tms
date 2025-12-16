import React, { useRef, useEffect } from 'react';
import { useSpring, animated, config } from '@react-spring/web';
import { useScroll, useWheel } from '@use-gesture/react';
import GestureJobCard from './GestureJobCard';

export default function PhysicsJobList({ 
  jobs, 
  deliveryTypes,
  pickupLocations,
  onJobClick,
  onJobDelete,
  showDeleteAction = false,
  title = 'Jobs',
  emptyMessage = 'No jobs to display'
}) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  // Momentum scrolling effect
  const [{ scrollY }, api] = useSpring(() => ({ 
    scrollY: 0,
    config: config.slow
  }));

  // Wheel gesture for smooth momentum scrolling
  const wheelBind = useWheel(
    ({ event, delta: [, dy], velocity: [, vy] }) => {
      event.preventDefault();
      
      const maxScroll = contentRef.current 
        ? contentRef.current.scrollHeight - containerRef.current.clientHeight 
        : 0;

      api.start({
        scrollY: Math.max(0, Math.min(maxScroll, scrollY.get() + dy)),
        config: { 
          tension: 200, 
          friction: 30,
          velocity: vy * 100
        }
      });
    },
    { target: containerRef }
  );

  // Update scroll position
  useEffect(() => {
    return scrollY.onChange(latest => {
      if (containerRef.current) {
        containerRef.current.scrollTop = latest;
      }
    });
  }, [scrollY]);

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      {...wheelBind()}
      className="space-y-2 overflow-y-auto h-full"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div ref={contentRef}>
        {jobs.map((job, index) => {
          const deliveryType = deliveryTypes.find(dt => dt.id === job.deliveryTypeId);
          const pickupLocation = pickupLocations.find(loc => loc.id === job.pickupLocationId);
          
          return (
            <GestureJobCard
              key={job.id}
              job={job}
              deliveryType={deliveryType}
              pickupLocation={pickupLocation}
              onClick={onJobClick}
              onDelete={onJobDelete}
              showDeleteAction={showDeleteAction}
            />
          );
        })}
      </div>
    </div>
  );
}