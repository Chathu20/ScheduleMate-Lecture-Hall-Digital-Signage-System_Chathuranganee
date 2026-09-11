import type { ReactNode } from 'react';
import { colors, fonts, noteBoxStyle } from '../theme';

interface ModalProps {
  title: string;
  headerColor?: string;
  width?: number;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, headerColor = colors.modalNavy, width = 440, onClose, children }: ModalProps) {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff', borderRadius: 10, width, maxWidth: '100%',
          maxHeight: '90vh', overflowY: 'auto', fontFamily: fonts.base,
          boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ backgroundColor: headerColor, color: '#fff', padding: '16px 22px', fontSize: 18, fontWeight: 700, borderRadius: '10px 10px 0 0' }}>
          {title}
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

export function NoteBox({ kind = 'warn', children }: { kind?: 'warn' | 'danger'; children: ReactNode }) {
  return <div style={noteBoxStyle(kind)}>{children}</div>;
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>{children}</div>;
}

export function ModalError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p style={{ color: colors.danger, fontSize: 13, marginTop: 10, marginBottom: 0 }}>{children}</p>;
}
