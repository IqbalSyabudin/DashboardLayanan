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

// LoginRequest adalah payload untuk endpoint login admin.
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Claims menyimpan identitas akun di dalam JWT.
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// Login hanya mengizinkan username admin yang disetel lewat environment.
func Login(c *gin.Context) {
	var input LoginRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format JSON tidak valid",
		})
		return
	}

	input.Username = strings.TrimSpace(input.Username)
	if input.Username == "" || strings.TrimSpace(input.Password) == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Username dan password wajib diisi",
		})
		return
	}

	adminUsername := strings.TrimSpace(os.Getenv("ADMIN_USERNAME"))
	if adminUsername == "" {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "ADMIN_USERNAME belum dikonfigurasi",
		})
		return
	}

	if input.Username != adminUsername {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Username atau password salah",
		})
		return
	}

	var admin User
	result := DB.Where("username = ?", adminUsername).First(&admin)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Username atau password salah",
		})
		return
	}
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa akun admin",
		})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Username atau password salah",
		})
		return
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "JWT_SECRET belum dikonfigurasi",
		})
		return
	}

	now := time.Now()
	claims := Claims{
		UserID:   admin.ID,
		Username: admin.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal membuat token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login berhasil",
		"token":   tokenString,
		"user": gin.H{
			"id":       admin.ID,
			"username": admin.Username,
		},
	})
}

// AuthMiddleware memastikan token valid dan cocok dengan akun admin aktif.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Token diperlukan",
			})
			c.Abort()
			return
		}

		parts := strings.Fields(authHeader)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Format token harus Bearer <token>",
			})
			c.Abort()
			return
		}

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "JWT_SECRET belum dikonfigurasi",
			})
			c.Abort()
			return
		}

		token, err := jwt.ParseWithClaims(
			parts[1],
			&Claims{},
			func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secret), nil
			},
		)
		if err != nil || token == nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Token tidak valid atau sudah expired",
			})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(*Claims)
		if !ok || claims.UserID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Claims token tidak valid",
			})
			c.Abort()
			return
		}

		adminUsername := strings.TrimSpace(os.Getenv("ADMIN_USERNAME"))
		if adminUsername == "" {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "ADMIN_USERNAME belum dikonfigurasi",
			})
			c.Abort()
			return
		}
		if claims.Username != adminUsername {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Akses hanya untuk admin",
			})
			c.Abort()
			return
		}

		var admin User
		err = DB.Where("id = ? AND username = ?", claims.UserID, adminUsername).First(&admin).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Akun admin tidak valid",
			})
			c.Abort()
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal memvalidasi akun admin",
			})
			c.Abort()
			return
		}

		c.Set("user_id", admin.ID)
		c.Set("username", admin.Username)
		c.Next()
	}
}
