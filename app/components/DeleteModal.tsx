"use client";

import { X, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  itemName: string;
  title?: string;
}

export function DeleteModal({ isOpen, onClose, onConfirm, loading, itemName, title = "Excluir Item" }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-icon">
          <AlertTriangle size={32} />
        </div>

        <h2 className="delete-modal-title">{title}</h2>
        <p className="delete-modal-text">
          Tem certeza que deseja excluir <strong>{itemName}</strong>? Esta ação é permanente e não poderá ser desfeita.
        </p>

        <div className="modal-footer delete-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
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
              "Sim, excluir"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
