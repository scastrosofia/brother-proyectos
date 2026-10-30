import React, { useEffect } from 'react';
import { resolveAssetUrl } from '../lib/assets';

interface LightboxProps {
  images: string[];
  activeIndex: number;
  title?: string;
  onClose: () => void;
  onChangeIndex?: (nextIndex: number) => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  images,
  activeIndex,
  title,
  onClose,
  onChangeIndex,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onChangeIndex && images.length > 1) {
        onChangeIndex((activeIndex + 1) % images.length);
      }
      if (e.key === 'ArrowLeft' && onChangeIndex && images.length > 1) {
        onChangeIndex((activeIndex - 1 + images.length) % images.length);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeIndex, images.length, onChangeIndex, onClose]);

  const currentSrc = resolveAssetUrl(images[activeIndex]);
  if (!currentSrc) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Vista ampliada de imagen'}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '92vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#ffffff',
            gap: 16,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {title}
            {images.length > 1 ? ` (${activeIndex + 1} / ${images.length})` : ''}
          </span>
          <button
            type="button"
            className="btn"
            style={{ minHeight: 38, padding: '0 12px' }}
            onClick={onClose}
          >
            Cerrar ×
          </button>
        </div>

        <img
          src={currentSrc}
          alt={title || 'Imagen ampliada'}
          style={{
            maxWidth: '90vw',
            maxHeight: '78vh',
            objectFit: 'contain',
            borderRadius: 8,
            background: '#111111',
            border: '1px solid #444',
          }}
        />

        {images.length > 1 && onChangeIndex && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn"
              onClick={() =>
                onChangeIndex((activeIndex - 1 + images.length) % images.length)
              }
            >
              ← Anterior
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => onChangeIndex((activeIndex + 1) % images.length)}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
