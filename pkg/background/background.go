package background

import (
	"context"
	"log"
	"sync"
	"time"

	"wails-dbman/pkg/adapters"
	"wails-dbman/pkg/cache"
	"wails-dbman/pkg/loading"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type BackgroundLoader struct {
	connectionId string
	database     string
	adapter      adapters.BaseAdapter
	schema       cache.SchemaInfo
	cancel       context.CancelFunc
	ctx          context.Context
	appCtx       context.Context
}

var activeLoaders = make(map[string]*BackgroundLoader)
var loadersMutex sync.RWMutex

func IsBackgroundLoadingActive(connectionId, database string) bool {
	loadersMutex.RLock()
	defer loadersMutex.RUnlock()
	key := connectionId + ":" + database
	_, exists := activeLoaders[key]
	return exists
}

func StartBackgroundLoading(appCtx context.Context, connectionId, database string, adapter adapters.BaseAdapter, schema cache.SchemaInfo) error {
	loadersMutex.Lock()
	defer loadersMutex.Unlock()

	key := connectionId + ":" + database
	if _, exists := activeLoaders[key]; exists {
		return nil // Already running
	}

	ctx, cancel := context.WithCancel(context.Background())
	loader := &BackgroundLoader{
		connectionId: connectionId,
		database:     database,
		adapter:      adapter,
		schema:       schema,
		cancel:       cancel,
		ctx:          ctx,
		appCtx:       appCtx,
	}
	activeLoaders[key] = loader

	go loader.run()
	return nil
}

func StopBackgroundLoading(connectionId, database string) bool {
	loadersMutex.Lock()
	defer loadersMutex.Unlock()

	key := connectionId + ":" + database
	if loader, exists := activeLoaders[key]; exists {
		loader.cancel()
		delete(activeLoaders, key)
		return true
	}
	return false
}

func (bl *BackgroundLoader) run() {
	log.Printf("Starting background loading for %s:%s", bl.connectionId, bl.database)

	// Initialize loading states
	procs := make([]loading.ProcedureInitInfo, len(bl.schema.StoredProcedures))
	for i, proc := range bl.schema.StoredProcedures {
		procs[i] = loading.ProcedureInitInfo{
			Schema: proc.Schema,
			Name:   proc.Name,
		}
	}
	loading.InitLoadingStates(bl.connectionId, bl.database, procs)

	// Emit initial status
	runtime.EventsEmit(bl.appCtx, "backgroundLoaderStatusUpdate", map[string]interface{}{
		"connectionId": bl.connectionId,
		"database":     bl.database,
		"active":       true,
	})

	// Process procedures
	for _, proc := range bl.schema.StoredProcedures {
		select {
		case <-bl.ctx.Done():
			log.Printf("Background loading cancelled for %s:%s", bl.connectionId, bl.database)
			return
		default:
		}

		key := proc.Schema + "." + proc.Name
		loading.SetLoadingState(bl.connectionId, bl.database, key, "loading")

		// Emit state update
		runtime.EventsEmit(bl.appCtx, "procedureStateUpdate", map[string]interface{}{
			"connectionId": bl.connectionId,
			"database":     bl.database,
			"states":       loading.GetAllLoadingStates(bl.connectionId, bl.database),
		})

		// Load procedure details
		details, err := bl.adapter.GetProcedureDetails(bl.database, proc.Schema, proc.Name)
		if err != nil {
			log.Printf("Failed to load procedure %s: %v", key, err)
			loading.SetLoadingError(bl.connectionId, bl.database, key, err.Error())
			cache.MarkProcedureAsFailed(bl.connectionId, bl.database, proc.Schema, proc.Name, err.Error())

			// Emit state update
			runtime.EventsEmit(bl.appCtx, "procedureStateUpdate", map[string]interface{}{
				"connectionId": bl.connectionId,
				"database":     bl.database,
				"states":       loading.GetAllLoadingStates(bl.connectionId, bl.database),
			})
			continue
		}

		// Store in cache
		parameters := make([]cache.ProcedureParameterData, len(details.Parameters))
		for i, param := range details.Parameters {
			parameters[i] = cache.ProcedureParameterData{
				Name:         param.Name,
				Type:         param.Type,
				Direction:    param.Mode,
				DefaultValue: param.DefaultValue,
				IsNullable:   param.IsNullable,
				MaxLength:    param.MaxLength,
				Precision:    param.Precision,
				Scale:        param.Scale,
			}
		}

		resultSets := make([]cache.ResultSetData, len(details.ResultSets))
		for i, rs := range details.ResultSets {
			columns := make([]cache.ResultSetColumnData, len(rs.Columns))
			for j, col := range rs.Columns {
				columns[j] = cache.ResultSetColumnData{
					Name:      col.Name,
					Type:      col.Type,
					Nullable:  col.Nullable,
					MaxLength: col.MaxLength,
					Precision: col.Precision,
					Scale:     col.Scale,
				}
			}
			resultSets[i] = cache.ResultSetData{
				Columns: columns,
			}
		}

		procedureDetails := cache.ProcedureDetailsData{
			Definition: details.Definition,
			Parameters: parameters,
			ResultSets: resultSets,
		}

		cache.UpdateProcedureInSchema(bl.connectionId, bl.database, proc.Schema, proc.Name, procedureDetails)

		loading.SetLoadingState(bl.connectionId, bl.database, key, "loaded")

		// Emit state update
		runtime.EventsEmit(bl.appCtx, "procedureStateUpdate", map[string]interface{}{
			"connectionId": bl.connectionId,
			"database":     bl.database,
			"states":       loading.GetAllLoadingStates(bl.connectionId, bl.database),
		})

		// Small delay to prevent overwhelming the database
		time.Sleep(100 * time.Millisecond)
	}

	log.Printf("Background loading completed for %s:%s", bl.connectionId, bl.database)

	// Remove from active loaders
	loadersMutex.Lock()
	delete(activeLoaders, bl.connectionId+":"+bl.database)
	loadersMutex.Unlock()

	// Emit final status
	runtime.EventsEmit(bl.appCtx, "backgroundLoaderStatusUpdate", map[string]interface{}{
		"connectionId": bl.connectionId,
		"database":     bl.database,
		"active":       false,
	})
}
