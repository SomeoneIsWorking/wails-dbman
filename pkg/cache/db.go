package cache

import (
	"log"
	"os"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	var err error
	dbPath := os.Getenv("DATABASE_URL")
	if dbPath == "" {
		dbPath = "./db.sqlite"
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
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
}
