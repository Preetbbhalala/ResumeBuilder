import { useCallback, useRef } from 'react';

/**
 * Draggable divider between two panels.
 * onResize(delta) is called with pixel delta on each mousemove.
 */
export default function PanelDivider({ onResize, disabled = false }) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const handleMouseDown = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    dragging.current = true;
    lastX.current = e.clientX;

    // Lock cursor globally so it doesn't flicker when moving quickly
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e) => {
      if (!dragging.current) return;
      const delta = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onResize(delta);
    };

    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [onResize, disabled]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="group flex-shrink-0 relative"
      style={{
        width: 5,
        height: '100%',
        cursor: disabled ? 'default' : 'col-resize',
        background: '#e2e8f0',
        transition: 'background 0.15s',
        zIndex: 10,
      }}
      title={disabled ? undefined : 'Drag to resize'}
    >
      {/* Hit area wider than visual bar */}
      <div
        className="absolute inset-y-0 group-hover:bg-indigo-400"
        style={{
          left: -3,
          right: -3,
          background: 'transparent',
          transition: 'background 0.15s',
        }}
      />
      {/* Visual dot indicator on hover */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          width: 3,
          height: 24,
          borderRadius: 2,
          background: '#6366f1',
        }}
      />
    </div>
  );
}
