package main

import (
	"context"
	"log"
	"wails-dbman/pkg/adapters"
	"wails-dbman/pkg/background"
	"wails-dbman/pkg/cache"
	"wails-dbman/pkg/loading"
	"wails-dbman/pkg/search"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	cache.InitDB()
}

func (a *App) createAdapter(connectionId string) (adapters.BaseAdapter, error) {
	conn, err := cache.GetConnection(connectionId)
	if err != nil {
		return nil, err
	}
	config := adapters.ConnectionConfig{
		Type:             conn.Type,
		Host:             conn.Host,
		Port:             conn.Port,
		Username:         conn.Username,
		Password:         conn.Password,
		Database:         conn.Database,
		ConnectionString: conn.ConnectionString,
		ConnectionID:     connectionId,
	}
	factory := adapters.AdapterFactory{}
	adapter, err := factory.CreateAdapter(config)
	if err != nil {
		return nil, err
	}
	return adapter, nil
}

func (a *App) GetConnections() ([]cache.Connection, error) {
	return cache.GetConnections()
}

func (a *App) CreateConnection(conn cache.Connection) (cache.Connection, error) {
	return cache.CreateConnection(conn)
}

func (a *App) GetConnection(id string) (cache.Connection, error) {
	return cache.GetConnection(id)
}

func (a *App) UpdateConnection(id string, data map[string]interface{}) (cache.Connection, error) {
	return cache.UpdateConnection(id, data)
}

func (a *App) DeleteConnection(id string) error {
	return cache.DeleteConnection(id)
}

func (a *App) TestConnection(conn cache.Connection) error {
	config := adapters.ConnectionConfig{
		Type:             conn.Type,
		Host:             conn.Host,
		Port:             conn.Port,
		Username:         conn.Username,
		Password:         conn.Password,
		Database:         conn.Database,
		ConnectionString: conn.ConnectionString,
	}
	factory := adapters.AdapterFactory{}
	adapter, err := factory.CreateAdapter(config)
	if err != nil {
		return err
	}
	// Try to list databases to test the connection
	_, err = adapter.ListDatabases()
	return err
}

func (a *App) GetDatabases(connectionId string, invalidate bool) ([]string, error) {
	// Check cache first
	if !invalidate {
		cached, err := cache.GetCachedDatabases(connectionId)
		if err != nil {
			return nil, err
		}
		if cached != nil {
			return cached.Databases, nil
		}
	}
	// Fetch from DB
	adapter, err := a.createAdapter(connectionId)
	if err != nil {
		return nil, err
	}
	databases, err := adapter.ListDatabases()
	if err != nil {
		return nil, err
	}
	// Cache
	err = cache.CacheDatabases(connectionId, databases)
	if err != nil {
		// Log but don't fail
	}
	return databases, nil
}

func (a *App) GetSchema(connectionId, database string, invalidate bool) (*cache.SchemaResponse, error) {
	// Check cache first
	if !invalidate {
		cached, err := cache.GetCachedSchema(connectionId, database)
		if err != nil {
			return nil, err
		}
		if cached != nil {
			// Get loading states
			states := loading.GetAllLoadingStates(connectionId, database)
			cached.LoadingStates = states
			return cached, nil
		}
	}
	// Fetch from DB
	adapter, err := a.createAdapter(connectionId)
	if err != nil {
		return nil, err
	}
	schema, err := adapter.GetSchema(database)
	if err != nil {
		log.Printf("Error getting schema for database %s: %v", database, err)
		return nil, err
	}
	// Cache
	err = cache.CacheSchema(connectionId, database, *schema)
	if err != nil {
		// Log but don't fail
	}
	// Get loading states
	states := loading.GetAllLoadingStates(connectionId, database)
	result := &cache.SchemaResponse{
		Tables:           make([]cache.TableResponse, len(schema.Tables)),
		Views:            make([]cache.ViewResponse, len(schema.Views)),
		StoredProcedures: make([]cache.ProcedureResponse, len(schema.StoredProcedures)),
		LoadingStates:    states,
	}
	for i, table := range schema.Tables {
		columns := make([]cache.ColumnResponse, len(table.Columns))
		for j, col := range table.Columns {
			columns[j] = cache.ColumnResponse{
				Name:         col.Name,
				Type:         col.Type,
				Nullable:     col.Nullable,
				DefaultValue: col.DefaultValue,
				Primary:      col.Primary,
				Unique:       col.Unique,
				Foreign:      col.Foreign,
				Comment:      col.Comment,
			}
		}
		result.Tables[i] = cache.TableResponse{
			Name:       table.Name,
			Schema:     table.Schema,
			Columns:    columns,
			PrimaryKey: table.PrimaryKey,
		}
	}
	for i, view := range schema.Views {
		columns := make([]cache.ColumnResponse, len(view.Columns))
		for j, col := range view.Columns {
			columns[j] = cache.ColumnResponse{
				Name:         col.Name,
				Type:         col.Type,
				Nullable:     col.Nullable,
				DefaultValue: col.DefaultValue,
			}
		}
		result.Views[i] = cache.ViewResponse{
			Name:       view.Name,
			Schema:     view.Schema,
			Columns:    columns,
			Definition: view.Definition,
		}
	}
	for i, proc := range schema.StoredProcedures {
		result.StoredProcedures[i] = cache.ProcedureResponse{
			Name:   proc.Name,
			Schema: proc.Schema,
		}
	}
	return result, nil
}

func (a *App) GetLoadingStates(connectionId, database string) (*cache.LoadingStatesResponse, error) {
	states := loading.GetAllLoadingStates(connectionId, database)
	return &cache.LoadingStatesResponse{
		States: states,
	}, nil
}

func (a *App) Search(query, connectionId, database string) ([]search.SearchResult, error) {
	// Ensure schema is cached
	_, err := a.GetSchema(connectionId, database, false)
	if err != nil {
		return nil, err
	}
	return search.Search(query, connectionId, database)
}

func (a *App) ProcedureSearch(query string) ([]search.ProcedureSearchResult, error) {
	return search.ProcedureSearch(query)
}

func (a *App) AnalyzeProcedure(connectionId, database, schema, name string) (*cache.StoredProcedureInfo, error) {
	log.Printf("AnalyzeProcedure called with connectionId=%s, database=%s, schema=%s, name=%s", connectionId, database, schema, name)
	adapter, err := a.createAdapter(connectionId)
	if err != nil {
		log.Printf("Error creating adapter: %v", err)
		return nil, err
	}
	result, err := adapter.GetProcedureDetails(database, schema, name)
	if err != nil {
		log.Printf("Error getting procedure details: %v", err)
		return nil, err
	}
	if result == nil {
		log.Printf("GetProcedureDetails returned nil")
	}
	log.Printf("AnalyzeProcedure completed successfully")
	return result, nil
}

func (a *App) GetBackgroundLoaderStatus(connectionId, database string) (*cache.BackgroundLoaderStatusResponse, error) {
	active := background.IsBackgroundLoadingActive(connectionId, database)
	return &cache.BackgroundLoaderStatusResponse{
		Active: active,
	}, nil
}

func (a *App) StartBackgroundLoader(connectionId, database string) error {
	cachedSchema, err := cache.GetCachedSchema(connectionId, database)
	if err != nil || cachedSchema == nil {
		return err
	}
	adapter, err := a.createAdapter(connectionId)
	if err != nil {
		return err
	}
	// Convert cached schema back to SchemaInfo
	schema := cache.SchemaInfo{}
	for _, table := range cachedSchema.Tables {
		schema.Tables = append(schema.Tables, cache.TableInfo{
			Name:   table.Name,
			Schema: table.Schema,
		})
	}
	for _, proc := range cachedSchema.StoredProcedures {
		schema.StoredProcedures = append(schema.StoredProcedures, cache.StoredProcedureInfo{
			Name:   proc.Name,
			Schema: proc.Schema,
		})
	}
	return background.StartBackgroundLoading(a.ctx, connectionId, database, adapter, schema)
}

func (a *App) StopBackgroundLoader(connectionId, database string) error {
	stopped := background.StopBackgroundLoading(connectionId, database)
	if !stopped {
		return nil // Not an error if not running
	}
	return nil
}

type GetTableDataRequest struct {
	ConnectionID string `json:"connectionId"`
	Database     string `json:"database"`
	Schema       string `json:"schema"`
	TableName    string `json:"tableName"`
	Page         int    `json:"page"`
	Limit        int    `json:"limit"`
}

func (a *App) GetTableData(request GetTableDataRequest) (*cache.TableDataResponse, error) {
	adapter, err := a.createAdapter(request.ConnectionID)
	if err != nil {
		return nil, err
	}

	// Get table data with pagination
	options := map[string]interface{}{
		"page":  request.Page,
		"limit": request.Limit,
	}

	return adapter.GetTableData(request.Database, request.Schema, request.TableName, options)
}

func (a *App) GetViewData(connectionId, database, schema, viewName string, limit int) (*cache.TableDataResponse, error) {
	adapter, err := a.createAdapter(connectionId)
	if err != nil {
		return nil, err
	}

	// For views, we can use the same GetTableData method but treat it as a table
	options := map[string]interface{}{
		"limit": limit,
	}

	return adapter.GetTableData(database, schema, viewName, options)
}
