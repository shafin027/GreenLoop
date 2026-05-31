import React from 'react';
import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Award;
  return <IconComponent className={className} />;
};
