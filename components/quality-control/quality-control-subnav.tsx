"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Language } from "@/lib/i18n";

export function QualityControlSubnav({ language }: { language: Language }) {
  const pathname = usePathname() || "";
  const items = [
    { href: "/quality-control/test-cases", label: language === "en" ? "Test Cases" : "测试用例管理" },
    { href: "/quality-control/certifications", label: language === "en" ? "Certifications" : "认证管理" },
    { href: "/quality-control/ort-reports", label: language === "en" ? "ORT Reports" : "ORT 报告管理" },
    { href: "/quality-control/eight-d", label: language === "en" ? "8D Reports" : "8D 报告管理" },
  ];
  const isOn = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`app-subnav-link ${isOn(item.href) ? "app-subnav-link-active" : ""}`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
