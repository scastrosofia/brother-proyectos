import React, { useState } from 'react';

interface StarRatingProps {
  value: number;
  max?: number;
  onChange?: (val: number) => void;
  readOnly?: boolean;
  label?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  max = 10,
  onChange,
  readOnly = false,
  label,
}) => {
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const displayVal = hoverVal !== null ? hoverVal : value;

  if (readOnly) {
    const rounded = Math.round(value);
    return (
      <span
        className="stars-row"
        aria-label={`${value.toFixed(1)} de ${max}`}
        style={{ gap: 1 }}
      >
        {Array.from({ length: max }, (_, idx) => {
          const starNum = idx + 1;
          const filled = starNum <= rounded;
          return (
            <span
              key={starNum}
              aria-hidden="true"
              style={{
                fontSize: 15,
                color: filled ? 'var(--accent-yellow)' : '#444444',
                textShadow: filled ? '0 0 6px rgba(254, 254, 61, 0.4)' : 'none',
              }}
            >
              {filled ? '★' : '☆'}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <div
      className="stars-row"
      role="radiogroup"
      aria-label={label || 'Puntaje del 1 al 10'}
      onMouseLeave={() => setHoverVal(null)}
    >
      {Array.from({ length: max }, (_, idx) => {
        const starNum = idx + 1;
        const filled = starNum <= displayVal;
        return (
          <button
            key={starNum}
            type="button"
            className={`star-btn ${filled ? 'star-btn--filled' : ''}`}
            aria-label={`${starNum} de ${max}`}
            aria-checked={value === starNum}
            role="radio"
            onMouseEnter={() => setHoverVal(starNum)}
            onClick={() => onChange?.(starNum)}
          >
            {filled ? '★' : '☆'}
          </button>
        );
      })}
    </div>
  );
};
