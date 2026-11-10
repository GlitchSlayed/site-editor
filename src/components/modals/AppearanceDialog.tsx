import React from 'react';
import { X } from 'lucide-react';

export interface AppearanceDialogProps {
  open: boolean;
  appAccent: string;
  accentDraft: string;
  accentPresets: Array<{ label: string; value: string }>;
  defaultAccent: string;
  onClose: () => void;
  onUpdateAccent: (color: string) => void;
}

export function AppearanceDialog({
  open,
  appAccent,
  accentDraft,
  accentPresets,
  defaultAccent,
  onClose,
  onUpdateAccent,
}: AppearanceDialogProps) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="appearance-modal modal-card">
        <div className="modal-title">
          <div>
            <span className="eyebrow">APPEARANCE</span>
            <h2>App accent color</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close appearance settings">
            <X size={16} />
          </button>
        </div>
        <p className="modal-copy">
          Choose a highlight color for buttons, selection, editor controls, and the Purpose mark. Your choice is saved on this device.
        </p>
        <div className="accent-swatches">
          {accentPresets.map(preset => (
            <button
              key={preset.value}
              className={`accent-swatch ${appAccent === preset.value ? 'selected' : ''}`}
              style={{ '--swatch-color': preset.value } as React.CSSProperties}
              onClick={() => onUpdateAccent(preset.value)}
              aria-label={`${preset.label} accent`}
              title={preset.label}
            />
          ))}
        </div>
        <label className="field">
          <span>Custom color</span>
          <div className="color-input accent-input">
            <input type="color" value={appAccent} onChange={e => onUpdateAccent(e.target.value)} />
            <input
              value={accentDraft}
              onChange={e => onUpdateAccent(e.target.value)}
              placeholder="#ff5b36"
              aria-label="Accent color hex value"
            />
          </div>
        </label>
        <div className="accent-preview-row">
          <span className="accent-preview-dot" style={{ background: appAccent }} /> Current app accent{' '}
          <button className="text-button" onClick={() => onUpdateAccent(defaultAccent)}>
            Reset
          </button>
        </div>
        <div className="modal-actions">
          <button className="button button-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
