import * as Lucide from "lucide-react";

// Curated icon set for the icon picker
export const ICON_CHOICES = [
  "Megaphone", "Newspaper", "Cake", "Users", "Calendar", "Award",
  "MessageSquare", "Bell", "Star", "Gift", "Trophy", "Briefcase",
  "Heart", "Flag", "BookOpen", "Coffee", "PartyPopper", "Lightbulb",
  "Target", "Rocket", "FileText", "Handshake", "GraduationCap", "Building2",
  "Bus", "MapPin", "Route", "Navigation",
];

export const Icon = ({ name, className, ...props }) => {
  const Cmp = (name && Lucide[name]) || Lucide.Megaphone;
  return <Cmp className={className} strokeWidth={1.75} {...props} />;
};
