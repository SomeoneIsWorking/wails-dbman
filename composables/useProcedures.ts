import { ref, onMounted, onUnmounted } from "vue";
import { useAsyncFetch } from "~/composables/useAsyncFetch";
import type { ProcedureState } from "~/types/schema";

type LoadingState = ProcedureState['state'];

export function useProcedures(connectionId: string, database: string) {
  const procedureStates = ref<Map<string, ProcedureState>>(new Map());
  let pollingInterval: NodeJS.Timeout | null = null;
  const { fetch } = useAsyncFetch();

  const areAllProceduresResolved = () => {
    if (procedureStates.value.size === 0) return false;
    return [...procedureStates.value.values()].every(
      (state) => state.state === "loaded" || state.state === "failed"
    );
  };

  const setInitialStates = (states: Record<string, ProcedureState>) => {
    procedureStates.value = new Map(Object.entries(states));
    // If all procedures are resolved, don't start polling
    if (areAllProceduresResolved()) {
      stopPolling();
    }
  };

  const startPolling = () => {
    // Poll every 2 seconds
    pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/connections/${connectionId}/${database}/loading-states`
        );
        if (response) {
          procedureStates.value = new Map(Object.entries(response.states));
          // Stop polling if all procedures are resolved
          if (areAllProceduresResolved()) {
            stopPolling();
          }
        }
      } catch (error) {
        console.error("Failed to fetch loading states:", error);
      }
    }, 2000);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  const getProcedureState = (
    schema: string,
    name: string
  ): LoadingState | undefined => {
    return procedureStates.value.get(`${schema}.${name}`)?.state;
  };

  const getProcedureError = (
    schema: string,
    name: string
  ): string | undefined => {
    return procedureStates.value.get(`${schema}.${name}`)?.error;
  };

  onMounted(() => {
    startPolling();
  });

  onUnmounted(() => {
    stopPolling();
  });

  return {
    getProcedureState,
    getProcedureError,
    setInitialStates,
  };
}
