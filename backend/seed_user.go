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
		log.Fatal("ADMIN_USERNAME dan ADMIN_PASSWORD wajib diatur")
	}

	if len(password) < 12 {
		log.Fatal("ADMIN_PASSWORD harus minimal 12 karakter")
	}

	if len(password) > 72 {
		log.Fatal("ADMIN_PASSWORD tidak boleh lebih dari 72 byte")
	}

	var admin User

	err := DB.Where("username = ?", username).First(&admin).Error

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Fatal("Gagal mencari akun admin: ", err)
	}

	hash, hashErr := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcrypt.DefaultCost,
	)

	if hashErr != nil {
		log.Fatal("Gagal hash password admin: ", hashErr)
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		admin = User{
			Username: username,
			Password: string(hash),
			Role:     RoleSuperAdmin,
		}

		if err := DB.Create(&admin).Error; err != nil {
			log.Fatal("Gagal membuat akun Super Admin: ", err)
		}

		log.Println("Akun Super Admin berhasil dibuat.")
		return
	}

	updates := map[string]interface{}{
		"role":       RoleSuperAdmin,
		"wilayah_id": nil,
	}

	if bcrypt.CompareHashAndPassword(
		[]byte(admin.Password),
		[]byte(password),
	) != nil {
		updates["password"] = string(hash)
	}

	if err := DB.Model(&admin).Updates(updates).Error; err != nil {
		log.Fatal("Gagal memperbarui akun Super Admin: ", err)
	}

	log.Println("Akun Super Admin tersedia.")
}
