import React from 'react';
import { Modal } from './Modal';
import { cn } from '../../utils/cn';

export function ImagePreviewModal({ isOpen, onClose, imageUrl, altText = "Preview" }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Image Preview" className="max-w-3xl">
      <div className="flex items-center justify-center bg-subcanvas min-h-[200px] rounded-md">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={altText} 
            className="max-w-full max-h-[70vh] object-contain rounded-md" 
          />
        ) : (
          <div className="text-ink-3 py-8">No image available</div>
        )}
      </div>
    </Modal>
  );
}
