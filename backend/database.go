package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	// Membaca file .env
	err := godotenv.Load()
	if err != nil {
		log.Println("File .env tidak ditemukan")
	}

	// Mengambil DATABASE_URL dari .env
	databaseURL := os.Getenv("DATABASE_URL")

	if databaseURL == "" {
		log.Fatal("DATABASE_URL belum diatur di file .env")
	}

	// Koneksi ke PostgreSQL
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		log.Fatal("Gagal terhubung ke database:", err)
	}

	DB = db

	fmt.Println("Database Supabase berhasil terhubung!")
}
