package main

import (
	"errors"
	"log"
	"os"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedAdmin() {
	username := strings.TrimSpace(os.Getenv("ADMIN_USERNAME"))
	password := os.Getenv("ADMIN_PASSWORD")

	if username == "" || password == "" {
		log.Fatal("ADMIN_USERNAME dan ADMIN_PASSWORD wajib diatur di backend/.env")
	}
	if len(password) < 12 {
		log.Fatal("ADMIN_PASSWORD harus minimal 12 karakter")
	}
	if len(password) > 72 {
		log.Fatal("ADMIN_PASSWORD tidak boleh lebih dari 72 byte untuk bcrypt")
	}

	var admin User
	err := DB.Where("username = ?", username).First(&admin).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Fatal("Gagal mencari akun admin: ", err)
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		hash, hashErr := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if hashErr != nil {
			log.Fatal("Gagal hash password admin: ", hashErr)
		}
		admin = User{Username: username, Password: string(hash)}
		if createErr := DB.Create(&admin).Error; createErr != nil {
			log.Fatal("Gagal membuat akun admin: ", createErr)
		}
		log.Println("Akun admin berhasil dibuat.")
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(password)) != nil {
		hash, hashErr := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if hashErr != nil {
			log.Fatal("Gagal hash password admin: ", hashErr)
		}
		if updateErr := DB.Model(&admin).Update("password", string(hash)).Error; updateErr != nil {
			log.Fatal("Gagal memperbarui password admin: ", updateErr)
		}
		log.Println("Password admin berhasil diperbarui dari konfigurasi.")
		return
	}

	log.Println("Akun admin tersedia.")
}
