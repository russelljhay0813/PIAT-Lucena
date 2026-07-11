import { useEffect } from "react";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider as PaperProvider, Snackbar } from "react-native-paper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initDb } from "../src/lib/db";
import { useSyncStore } from "../src/lib/sync-store";
import { useToastStore } from "../src/lib/toast-store";

const queryClient = new QueryClient();

export default function Layout() {
  const sync = useSyncStore();
  const { visible, message, hideToast } = useToastStore();

  useEffect(() => {
    initDb().catch(console.error);
    sync.init();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <QueryClientProvider client={queryClient}>
          <Slot />
          <Snackbar visible={visible} onDismiss={hideToast} duration={3000}>
            {message}
          </Snackbar>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
