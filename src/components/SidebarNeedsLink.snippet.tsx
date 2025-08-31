import Link from "next/link";
import { ClipboardList } from "lucide-react";

export function NeedsSidebarItem() {
  return (
    <Link href="/needs" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-sm">
      <ClipboardList className="w-4 h-4" />
      <span>Besoins</span>
    </Link>
  );
}