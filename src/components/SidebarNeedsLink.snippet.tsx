import Link from "next/link";
import { ClipboardList } from "lucide-react";

export function NeedsSidebarItem() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-gray-400 text-sm cursor-not-allowed">
      <ClipboardList className="w-4 h-4" />
      <span>Besoins (en développement)</span>
    </div>
  );
}