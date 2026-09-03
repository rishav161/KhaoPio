import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  ChefHat,
  CreditCard,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Receipt,
  Rocket,
  Settings,
  TableProperties,
  Ticket,
  Users,
  UtensilsCrossed,
} from 'lucide-react';

/**
 * Icons that can be named by the database (SidebarItem.icon, HelpCategory.icon).
 *
 * This map is deliberately explicit. Importing the whole `lucide-react`
 * namespace and indexing it at runtime (`LucideIcons[name]`) defeats
 * tree-shaking — the bundler cannot know which icons are reachable, so it
 * ships all ~1,600 of them (~766 KB per chunk that does it).
 *
 * When you seed a new sidebar item or help category, add its icon here too;
 * anything unrecognised falls back to HelpCircle.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  ChefHat,
  CreditCard,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Receipt,
  Rocket,
  Settings,
  TableProperties,
  Ticket,
  Users,
  UtensilsCrossed,
};

export const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const Icon = ICON_MAP[name] ?? HelpCircle;
  return <Icon className={className} />;
};

export default DynamicIcon;
