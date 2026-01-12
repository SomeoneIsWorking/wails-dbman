import { ref, onMounted, onUnmounted } from "vue";
import type { ProcedureState } from "../types/schema";

type LoadingState = ProcedureState['state'];

export function useProcedures(connectionId: string, database: string) {
  const procedureStates = ref<Map<string, ProcedureState>>(new Map());
  let eventListener: (() => void) | null = null;

  const setInitialStates = (states: Record<string, ProcedureState>) => {
    procedureStates.value = new Map(Object.entries(states));
  };

  const startListening = () => {
    // Listen for procedure state updates
    eventListener = window.runtime.EventsOn("procedureStateUpdate", (data: any) => {
      if (data.connectionId === connectionId && data.database === database) {
        procedureStates.value = new Map(Object.entries(data.states));
      }
    });
  };

  const stopListening = () => {
    if (eventListener) {
      eventListener();
      eventListener = null;
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
    startListening();
  });

  onUnmounted(() => {
    stopListening();
  });

  return {
    getProcedureState,
    getProcedureError,
    setInitialStates,
  };
}
