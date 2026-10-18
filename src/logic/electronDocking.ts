export interface DisplayWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor?: number;
}

export interface WidgetDimensions {
  width: number;
  height: number;
  peekTabWidth: number;
}

export const DEFAULT_WIDGET_DIMS: WidgetDimensions = {
  width: 298,
  height: 80,
  peekTabWidth: 14,
};

/**
 * Calculates window position for docked and floating states,
 * respecting Windows 11 screen workArea, taskbar bounds, and DPI scaling.
 */
export function calculateWindowPosition(
  isDocked: boolean,
  dockState: 'hidden' | 'opening' | 'visible' | 'closing',
  workArea: DisplayWorkArea,
  floatingPos: { x: number; y: number },
  dims: WidgetDimensions = DEFAULT_WIDGET_DIMS
): { x: number; y: number } {
  // Clamp Y within screen workArea (accounting for Windows Taskbar at bottom or top)
  const minY = workArea.y + 10;
  const maxY = Math.max(minY, workArea.y + workArea.height - dims.height - 10);
  const clampedY = Math.max(minY, Math.min(maxY, floatingPos.y));

  if (!isDocked) {
    // Floating position clamped to visible workArea
    const minX = workArea.x + 10;
    const maxX = Math.max(minX, workArea.x + workArea.width - dims.width - 10);
    const clampedX = Math.max(minX, Math.min(maxX, floatingPos.x));
    return { x: Math.round(clampedX), y: Math.round(clampedY) };
  }

  // When docked:
  if (dockState === 'hidden') {
    // Only the peek tab remains visible on screen
    const targetX = workArea.x + workArea.width - dims.peekTabWidth;
    return { x: Math.round(targetX), y: Math.round(clampedY) };
  }

  // When opening or visible, widget is fully expanded on the screen edge
  const targetX = workArea.x + workArea.width - dims.width;
  return { x: Math.round(targetX), y: Math.round(clampedY) };
}

/**
 * Anti-flicker edge dock transition controller
 */
export class EdgeDockController {
  private state: 'floating' | 'hidden' | 'opening' | 'visible' | 'closing' = 'floating';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;
  private onStateChange?: (state: 'floating' | 'hidden' | 'opening' | 'visible' | 'closing') => void;

  constructor(
    isDocked = false,
    debounceMs = 300,
    onStateChange?: (state: 'floating' | 'hidden' | 'opening' | 'visible' | 'closing') => void
  ) {
    this.debounceMs = debounceMs;
    this.state = isDocked ? 'hidden' : 'floating';
    this.onStateChange = onStateChange;
  }

  public getState() {
    return this.state;
  }

  public setDocked(docked: boolean) {
    this.clearDebounce();
    this.state = docked ? 'hidden' : 'floating';
    this.notify();
  }

  public handleMouseEnter() {
    if (this.state === 'floating') return;

    this.clearDebounce();

    // If hidden or closing, start opening immediately without jumping
    if (this.state === 'hidden' || this.state === 'closing') {
      this.state = 'opening';
      this.notify();
    }
  }

  public handleAnimationComplete() {
    if (this.state === 'opening') {
      this.state = 'visible';
      this.notify();
    } else if (this.state === 'closing') {
      this.state = 'hidden';
      this.notify();
    }
  }

  public handleMouseLeave(isDropdownOpen = false) {
    if (this.state === 'floating' || isDropdownOpen) return;

    // Critical anti-flicker requirement:
    // If mouse leaves DURING opening animation, do NOT abruptly close or stutter.
    if (this.state === 'opening') {
      return;
    }

    if (this.state === 'visible') {
      this.clearDebounce();
      this.debounceTimer = setTimeout(() => {
        if (this.state === 'visible') {
          this.state = 'closing';
          this.notify();
        }
      }, this.debounceMs);
    }
  }

  private clearDebounce() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private notify() {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
