import styles from './ResponsiveGrid.module.css';

// A lightweight responsive grid container that grows columns based on available width.
// Props:
// - min: minimum column width in px (default 240)
// - gap: gap between grid items in px (default 14)
// - children: grid items
// - className: optional extra classes
export function ResponsiveGrid({ min = 240, gap = 14, children, className = '' }) {
  const style = {
    // CSS variable-based approach for dynamic min column width
    ['--min']:_toPx(min),
    ['--gap']: `${gap}px`,
  };
  return (
    <div className={[styles.grid, className].join(' ')} style={style}>
      {children}
    </div>
  );
}

function _toPx(n){ return typeof n === 'number' ? `${n}px` : n; }

export default ResponsiveGrid;
