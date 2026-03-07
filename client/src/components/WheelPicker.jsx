import { useRef, useEffect, useCallback } from 'react';

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 3;

export default function WheelPicker({ items, value, onChange }) {
  const containerRef = useRef(null);
  const scrollingRef = useRef(false);
  const timeoutRef = useRef(null);

  const selectedIndex = items.indexOf(value);
  const targetScroll = selectedIndex * ITEM_HEIGHT;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || scrollingRef.current) return;
    el.scrollTop = targetScroll;
  }, [targetScroll]);

  const handleScroll = useCallback(() => {
    scrollingRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const index = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' });
      if (items[clamped] !== value) {
        onChange(items[clamped]);
      }
      scrollingRef.current = false;
    }, 80);
  }, [items, value, onChange]);

  return (
    <div className="wheel-picker" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
      <div className="wheel-highlight" style={{ top: ITEM_HEIGHT, height: ITEM_HEIGHT }} />
      <div
        className="wheel-scroll"
        ref={containerRef}
        onScroll={handleScroll}
        style={{ paddingTop: ITEM_HEIGHT, paddingBottom: ITEM_HEIGHT }}
      >
        {items.map((item, i) => (
          <div
            key={item}
            className={`wheel-item ${item === value ? 'wheel-item-active' : ''}`}
            style={{ height: ITEM_HEIGHT, lineHeight: `${ITEM_HEIGHT}px` }}
            onClick={() => {
              onChange(item);
              containerRef.current?.scrollTo({ top: i * ITEM_HEIGHT, behavior: 'smooth' });
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
