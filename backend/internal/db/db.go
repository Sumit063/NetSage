package db

import (
    "time"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

type Store struct {
    DB *gorm.DB
}

func Open(databaseURL string, debug bool) (*Store, error) {
    cfg := &gorm.Config{}
    if debug {
        cfg.Logger = logger.Default.LogMode(logger.Info)
    }

    gdb, err := gorm.Open(postgres.Open(databaseURL), cfg)
    if err != nil {
        return nil, err
    }

    sqlDB, err := gdb.DB()
    if err != nil {
        return nil, err
    }

    sqlDB.SetMaxOpenConns(15)
    sqlDB.SetMaxIdleConns(5)
    sqlDB.SetConnMaxLifetime(30 * time.Minute)

    return &Store{DB: gdb}, nil
}
