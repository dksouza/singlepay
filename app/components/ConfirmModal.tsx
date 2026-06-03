"use client";

import { X, AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({ isOpen, onClose, onConfirm, loading, title, description, confirmText = "Confirmar", cancelText = "Cancelar" }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-container delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-icon">
          <AlertTriangle size={32} />
        </div>

        <h2 className="delete-modal-title">{title}</h2>
        <p className="delete-modal-text">
          {description}
        </p>

        <div className="modal-footer delete-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
