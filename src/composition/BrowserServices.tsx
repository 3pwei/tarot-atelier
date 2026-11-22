"use client";

import { useState, type ReactNode } from "react";
import { createBrowserServices } from "@/composition/createBrowserServices";
import { AtelierServicesProvider } from "@/presentation/services/atelierServices";

/** Provides the site's adapters to every component below it, created once per page. */
export function BrowserServices({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [services] = useState(createBrowserServices);
  return (
    <AtelierServicesProvider services={services}>
      {children}
    </AtelierServicesProvider>
  );
}
