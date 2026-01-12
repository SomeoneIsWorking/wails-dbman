package loading

import (
	"sync"
	"time"

	"wails-dbman/pkg/cache"
)

var loadingStates = make(map[string]map[string]cache.ProcedureState)
var statesMutex sync.RWMutex

type ProcedureInitInfo struct {
	Schema string `json:"schema"`
	Name   string `json:"name"`
}

func InitLoadingStates(connectionId, database string, procedures []ProcedureInitInfo) {
	statesMutex.Lock()
	defer statesMutex.Unlock()

	key := connectionId + ":" + database
	if _, exists := loadingStates[key]; !exists {
		loadingStates[key] = make(map[string]cache.ProcedureState)
	}

	now := time.Now().Unix()
	for _, proc := range procedures {
		procKey := proc.Schema + "." + proc.Name
		if _, exists := loadingStates[key][procKey]; !exists {
			loadingStates[key][procKey] = cache.ProcedureState{
				State:       "waiting",
				LastUpdated: now,
			}
		}
	}
}

func SetLoadingState(connectionId, database, procedureKey, state string) {
	statesMutex.Lock()
	defer statesMutex.Unlock()

	key := connectionId + ":" + database
	if _, exists := loadingStates[key]; !exists {
		loadingStates[key] = make(map[string]cache.ProcedureState)
	}

	now := time.Now().Unix()
	loadingStates[key][procedureKey] = cache.ProcedureState{
		State:       state,
		LastUpdated: now,
	}
}

func SetLoadingError(connectionId, database, procedureKey, errorMsg string) {
	statesMutex.Lock()
	defer statesMutex.Unlock()

	key := connectionId + ":" + database
	if _, exists := loadingStates[key]; !exists {
		loadingStates[key] = make(map[string]cache.ProcedureState)
	}

	now := time.Now().Unix()
	loadingStates[key][procedureKey] = cache.ProcedureState{
		State:       "failed",
		Error:       &errorMsg,
		LastUpdated: now,
	}
}

func GetAllLoadingStates(connectionId, database string) map[string]cache.ProcedureState {
	statesMutex.RLock()
	defer statesMutex.RUnlock()

	key := connectionId + ":" + database
	if states, exists := loadingStates[key]; exists {
		// Return a copy
		result := make(map[string]cache.ProcedureState)
		for k, v := range states {
			result[k] = v
		}
		return result
	}
	return make(map[string]cache.ProcedureState)
}

func GetLoadingState(connectionId, database, procedureKey string) *cache.ProcedureState {
	statesMutex.RLock()
	defer statesMutex.RUnlock()

	key := connectionId + ":" + database
	if states, exists := loadingStates[key]; exists {
		if state, exists := states[procedureKey]; exists {
			return &state
		}
	}
	return nil
}
