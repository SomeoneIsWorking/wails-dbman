package cache

import (
	"log"
	"os"
	"path/filepath"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	var err error
	dbPath := os.Getenv("DATABASE_URL")
	if dbPath == "" {
		configDir, err := os.UserConfigDir()
		if err != nil {
			log.Fatal("Failed to get user config dir:", err)
		}
		appDir := filepath.Join(configDir, "wails-dbman")
		err = os.MkdirAll(appDir, 0755)
		if err != nil {
			log.Fatal("Failed to create app config dir:", err)
		}
		dbPath = filepath.Join(appDir, "db.sqlite")
	}
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto migrate
	err = DB.AutoMigrate(
		&Connection{},
		&CachedDatabase{},
		&CachedSchema{},
		&CachedTable{},
		&CachedTableColumn{},
		&CachedTablePrimaryKey{},
		&CachedTableForeignKey{},
		&CachedView{},
		&CachedViewColumn{},
		&QueryHistory{},
		&CachedProcedure{},
		&ProcedureParameter{},
		&ProcedureResultSet{},
		&ResultSetColumn{},
		&Tab{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
}
