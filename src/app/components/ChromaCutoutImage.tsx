import { useEffect, useState } from 'react';

interface ChromaCutoutImageProps {
  src: string;
  alt: string;
  className?: string;
  threshold?: number;
}

export function ChromaCutoutImage({
  src,
  alt,
  className,
  threshold = 242,
}: ChromaCutoutImageProps) {
  const [processedSrc, setProcessedSrc] = useState<string>(src);

  useEffect(() => {
    let cancelled = false;

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setProcessedSrc(src);
        return;
      }

      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r >= threshold && g >= threshold && b >= threshold) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      if (!cancelled) {
        setProcessedSrc(canvas.toDataURL('image/png'));
      }
    };

    image.onerror = () => {
      if (!cancelled) setProcessedSrc(src);
    };

    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, threshold]);

  return <img src={processedSrc} alt={alt} className={className} draggable={false} />;
}
