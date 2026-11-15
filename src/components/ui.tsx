import { ArrowRight, CircleAlert, LoaderCircle, Search, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

export function Button({ variant = 'primary', className = '', ...props }: ComponentProps<'button'> & { variant?: 'primary' | 'secondary' }) {
  return <button className={`button button--${variant} ${className}`} {...props} />;
}

export function ActionLink({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' }) {
  return <a className={`button button--${variant}`} href={href}>{children}<ArrowRight size={17} aria-hidden="true" /></a>;
}

export function Card({ children, className = '', ...props }: ComponentProps<'div'>) {
  return <div className={`card ${className}`} {...props}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1 tabIndex={-1}>{title}</h1><p className="page-description">{description}</p></div>{children}</header>;
}

export function EmptyState({ icon: Icon, title, children, compact = false }: { icon: LucideIcon; title: string; children: ReactNode; compact?: boolean }) {
  return <div className={`empty-state ${compact ? 'empty-state--compact' : ''}`}><span className="empty-icon"><Icon size={29} strokeWidth={1.3} aria-hidden="true" /></span><h3>{title}</h3><p>{children}</p></div>;
}

export function TextInput({ label, ...props }: ComponentProps<'input'> & { label: string }) {
  return <label className="search-field"><span className="sr-only">{label}</span><Search size={19} aria-hidden="true" /><input type="search" {...props} /></label>;
}

export function LoadingIndicator({ children }: { children: ReactNode }) {
  return <span className="loading-indicator" role="status"><LoaderCircle size={15} className="spinner" aria-hidden="true" />{children}</span>;
}

export function Notice({ title, children, onRetry }: { title: string; children: ReactNode; onRetry?: () => void }) {
  return <div className="notice" role="alert"><CircleAlert size={21} aria-hidden="true" /><div><strong>{title}</strong><p>{children}</p></div>{onRetry && <Button variant="secondary" onClick={onRetry}>Tentar novamente</Button>}</div>;
}
