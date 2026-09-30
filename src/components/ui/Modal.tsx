import type { ReactNode } from 'react';
import { Button } from './Button';

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-t-3xl border border-linha bg-musgo p-6 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold text-gelo">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full px-3 py-1 text-xl text-cinza hover:bg-noite hover:text-gelo">×</button>
        </div>
        {children}
        <Button variant="secondary" fullWidth className="mt-4" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}
