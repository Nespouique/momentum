import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ProfileNavLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
}

export function ProfileNavLink({ href, icon: Icon, label }: ProfileNavLinkProps) {
  return (
    <Link href={href}>
      <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <span className="flex-1 font-medium">{label}</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  );
}
