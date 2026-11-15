package main

import (
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	RoleSuperAdmin  = "super_admin"
	RoleAdminPemkot = "admin_pemkot"
	RoleAdminPemkab = "admin_pemkab"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}
type Claims struct {
	UserID    uint    `json:"user_id"`
	Username  string  `json:"username"`
	Role      string  `json:"role"`
	WilayahID *uint64 `json:"wilayah_id"`
	jwt.RegisteredClaims
}

func validUserRole(role string) bool {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case RoleSuperAdmin, RoleAdminPemkot, RoleAdminPemkab:
		return true
	default:
		return false
	}
}

func validateUserRoleWilayah(user *User) error {
	if user == nil {
		return errors.New("data pengguna tidak ditemukan")
	}
	user.Role = strings.ToLower(strings.TrimSpace(user.Role))
	if !validUserRole(user.Role) {
		return errors.New("role pengguna tidak valid")
	}
	if user.Role == RoleSuperAdmin {
		if user.WilayahID != nil {
			return errors.New("super_admin harus memiliki wilayah_id NULL")
		}
		return nil
	}
	if user.WilayahID == nil || *user.WilayahID == 0 {
		return errors.New("wilayah_id wajib diisi")
	}
	var wilayah struct {
		ID   uint64
		Nama string
		Tipe string
	}
	if err := DB.Table("wilayah").Select("id", "nama", "tipe").Where("id = ?", *user.WilayahID).First(&wilayah).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("wilayah pengguna tidak ditemukan")
		}
		return errors.New("gagal memeriksa wilayah pengguna")
	}
	tipe := strings.ToLower(strings.TrimSpace(wilayah.Tipe))
	switch user.Role {
	case RoleAdminPemkot:
		if tipe != "kota" {
			return errors.New("admin_pemkot harus menggunakan wilayah bertipe Kota")
		}
	case RoleAdminPemkab:
		if tipe != "kabupaten" {
			return errors.New("admin_pemkab harus menggunakan wilayah bertipe Kabupaten")
		}
	}
	return nil
}

func createJWT(user User) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", errors.New("JWT_SECRET belum dikonfigurasi")
	}
	now := time.Now()
	claims := Claims{UserID: user.ID, Username: user.Username, Role: user.Role, WilayahID: user.WilayahID, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)), IssuedAt: jwt.NewNumericDate(now), NotBefore: jwt.NewNumericDate(now)}}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func Login(c *gin.Context) {
	var input LoginRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format JSON tidak valid"})
		return
	}
	input.Username = strings.TrimSpace(input.Username)
	if input.Username == "" || strings.TrimSpace(input.Password) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Username dan password wajib diisi"})
		return
	}
	var user User
	if err := DB.Where("username = ?", input.Username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Username atau password salah"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal memeriksa akun pengguna"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Username atau password salah"})
		return
	}
	if err := validateUserRoleWilayah(&user); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Konfigurasi role atau wilayah akun belum valid: " + err.Error()})
		return
	}
	token, err := createJWT(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal membuat token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Login berhasil", "token": token, "user": gin.H{"id": user.ID, "username": user.Username, "role": user.Role, "wilayah_id": user.WilayahID}})
}

func authenticateRequest(c *gin.Context, tokenString string) bool {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "JWT_SECRET belum dikonfigurasi"})
		return false
	}
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})
	if err != nil || token == nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Token tidak valid atau sudah kedaluwarsa"})
		return false
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || claims.UserID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Claims token tidak valid"})
		return false
	}
	var user User
	if err := DB.First(&user, claims.UserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Akun pengguna tidak ditemukan"})
			return false
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal memvalidasi akun pengguna"})
		return false
	}
	if err := validateUserRoleWilayah(&user); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Role atau wilayah akun tidak valid: " + err.Error()})
		return false
	}
	c.Set("user_id", user.ID)
	c.Set("username", user.Username)
	c.Set("role", user.Role)
	c.Set("wilayah_id", user.WilayahID)
	return true
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		parts := strings.Fields(c.GetHeader("Authorization"))
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Token diperlukan dengan format Bearer <token>"})
			c.Abort()
			return
		}
		if !authenticateRequest(c, parts[1]) {
			c.Abort()
			return
		}
		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("role")
		for _, allowed := range roles {
			if role == allowed {
				c.Next()
				return
			}
		}
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Kamu tidak memiliki hak akses untuk fitur ini"})
		c.Abort()
	}
}

func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := strings.TrimSpace(c.GetHeader("Authorization"))
		if header == "" {
			c.Next()
			return
		}
		parts := strings.Fields(header)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Format token tidak valid"})
			c.Abort()
			return
		}
		if !authenticateRequest(c, parts[1]) {
			c.Abort()
			return
		}
		c.Next()
	}
}
