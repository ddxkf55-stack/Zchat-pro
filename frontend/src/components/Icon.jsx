import * as Icons from 'lucide-react';

export default function Icon({ name, size = 20, color = 'currentColor', onClick, className }) {
  const LucideIcon = Icons[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} color={color} onClick={onClick} className={className} />;
}