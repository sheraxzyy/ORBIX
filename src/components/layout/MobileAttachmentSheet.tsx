import React, { useRef } from 'react';
import { Image, Camera, FileText, MapPin, X } from 'lucide-react';

interface MobileAttachmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (file: File) => void;
}

export const MobileAttachmentSheet: React.FC<MobileAttachmentSheetProps> = ({
  isOpen,
  onClose,
  onSelectFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTriggerInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSelectFile) {
      onSelectFile(file);
    }
    onClose();
  };

  const actions = [
    { label: 'Photos & Videos', icon: Image, color: 'text-blue-500', action: handleTriggerInput },
    { label: 'Camera', icon: Camera, color: 'text-primary', action: handleTriggerInput },
    { label: 'Documents', icon: FileText, color: 'text-amber-500', action: handleTriggerInput },
    {
      label: 'Location',
      icon: MapPin,
      color: 'text-emerald-500',
      action: () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              alert(`Location: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
              onClose();
            },
            () => {
              alert('Location permission denied.');
              onClose();
            }
          );
        } else {
          alert('Geolocation not supported.');
          onClose();
        }
      },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fade-in md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
      />

      <div className="bg-surface rounded-t-2xl border-t border-border p-5 pb-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 id="sheet-title" className="text-sm font-bold text-text">
            Add Attachment
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text focus-visible:outline-primary"
            aria-label="Close attachment drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.label}
                type="button"
                onClick={act.action}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors focus-visible:outline-primary"
              >
                <div className={`p-2.5 rounded-full bg-surface ${act.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-text font-medium leading-tight">
                  {act.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
