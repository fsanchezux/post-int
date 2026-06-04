"use client";

import { ReactNode, useEffect, useState } from "react";
import { SyncProvider } from "@/components/SyncProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { BoardUIProvider } from "@/components/BoardUIContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StorageQuotaToast } from "@/components/StorageQuotaToast";
import { I18nProvider } from "@/lib/i18n";
import { useSettings } from "@/lib/storage";
import type { Language } from "@/lib/types";

function I18nWrapper({ children }: { children: ReactNode }) {
  const { settings, hydrated } = useSettings();
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    if (hydrated) {
      setLang(settings?.language || "en");
    }
  }, [hydrated, settings?.language]);

  return (
    <I18nProvider initialLanguage={lang}>
      {children}
    </I18nProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nWrapper>
      <SyncProvider>
        <ThemeProvider>
          <ConfirmProvider>
            <BoardUIProvider>
              {children}
              <StorageQuotaToast />
            </BoardUIProvider>
          </ConfirmProvider>
        </ThemeProvider>
      </SyncProvider>
    </I18nWrapper>
  );
}