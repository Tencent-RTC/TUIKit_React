import { useEffect, useState, useCallback, RefObject } from 'react';

interface UseResponsiveGridOptions {
  itemsPerRow: number;
  gap: number;
  containerPadding: number;
  aspectRatio: number;
  containerRef: RefObject<HTMLElement>;
}

export const useResponsiveGrid = (options: UseResponsiveGridOptions) => {
  const { itemsPerRow, gap, containerPadding, aspectRatio, containerRef } = options;

  if (itemsPerRow <= 0 || gap < 0 || containerPadding < 0 || aspectRatio <= 0 || !containerRef) {
    throw new Error('invalid params');
  }

  const [itemWidth, setItemWidth] = useState(0);
  const [itemHeight, setItemHeight] = useState(0);

  const calculateLayout = useCallback(() => {
    if (!containerRef?.current) {
      return;
    }

    const containerElement = containerRef.current;
    const containerWidth = containerElement.clientWidth - containerPadding;
    
    // Calculate item width based on fixed items per row
    const totalGapWidth = (itemsPerRow - 1) * gap;
    const availableItemWidth = (containerWidth - totalGapWidth) / itemsPerRow;
    const finalItemWidth = Math.max(0, availableItemWidth);
    const finalItemHeight = aspectRatio > 0 ? finalItemWidth / aspectRatio : finalItemWidth;

    setItemWidth(finalItemWidth);
    setItemHeight(finalItemHeight);
  }, [itemsPerRow, gap, containerPadding, aspectRatio, containerRef]);

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;

    const setupObserver = () => {
      if (containerRef?.current) {
        calculateLayout();
        // Set ResizeObserver to listen for container size changes
        resizeObserver = new ResizeObserver(() => {
          calculateLayout();
        });

        resizeObserver.observe(containerRef.current);
      } else {
        // If the container is not mounted, use MutationObserver to wait for mounting
        const mutationObserver = new MutationObserver(() => {
          if (containerRef?.current) {
            setupObserver();
            mutationObserver.disconnect();
          }
        });

        mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });

        return () => mutationObserver.disconnect();
      }
    };
    setupObserver();
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [calculateLayout]);

  return {
    itemWidth,
    itemHeight,
    itemsPerRow,
  };
};
