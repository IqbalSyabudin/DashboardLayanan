package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"endpoint_api/models"
)

const (
	RoleSuperAdmin  = "super_admin"
	RoleAdminPemkot = "admin_pemkot"
	RoleAdminPemkab = "admin_pemkab"
)

type UserHandler struct {
	DB *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{DB: db}
}

type userRecord struct {
	ID        uint    `gorm:"primaryKey"`
	Username  string  `gorm:"unique;not null"`
	Password  string  `gorm:"not null"`
	Role      string  `gorm:"not null"`
	WilayahID *uint64 `gorm:"index"`
}

func (userRecord) TableName() string {
	return "users"
}

type userResponse struct {
	ID        uint    `json:"id"`
	Username  string  `json:"username"`
	Role      string  `json:"role"`
	WilayahID *uint64 `json:"wilayah_id"`
}

type userRequest struct {
	Username  string  `json:"username" binding:"required"`
	Password  string  `json:"password"`
	Role      string  `json:"role" binding:"required"`
	WilayahID *uint64 `json:"wilayah_id"`
}

func mapUser(user userRecord) userResponse {
	return userResponse{
		ID:        user.ID,
		Username:  user.Username,
		Role:      user.Role,
		WilayahID: user.WilayahID,
	}
}

func normalizeRole(role string) string {
	return strings.ToLower(strings.TrimSpace(role))
}

func validAdminRole(role string) bool {
	switch normalizeRole(role) {
	case RoleAdminPemkot, RoleAdminPemkab:
		return true
	default:
		return false
	}
}

// Memastikan role sesuai dengan tipe wilayah.
func (h *UserHandler) validateWilayah(role string, wilayahID *uint64) error {
	if wilayahID == nil || *wilayahID == 0 {
		return errors.New("wilayah wajib dipilih")
	}

	var wilayah models.Wilayah

	if err := h.DB.First(&wilayah, *wilayahID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("wilayah tidak ditemukan")
		}
		return errors.New("gagal memeriksa wilayah")
	}

	tipe := strings.ToLower(strings.TrimSpace(wilayah.Tipe))
	role = normalizeRole(role)

	switch role {
	case RoleAdminPemkot:
		if tipe != "kota" {
			return errors.New("admin_pemkot hanya dapat menggunakan wilayah bertipe kota")
		}

	case RoleAdminPemkab:
		if tipe != "kabupaten" {
			return errors.New("admin_pemkab hanya dapat menggunakan wilayah bertipe kabupaten")
		}

	default:
		return errors.New("role admin tidak valid")
	}

	return nil
}

// GET /api/pengguna
func (h *UserHandler) GetUsers(c *gin.Context) {
	var users []userRecord

	if err := h.DB.
		Select("id", "username", "role", "wilayah_id").
		Order("id ASC").
		Find(&users).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data pengguna",
		})
		return
	}

	result := make([]userResponse, 0, len(users))

	for _, user := range users {
		result = append(result, mapUser(user))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// POST /api/pengguna
func (h *UserHandler) CreateUser(c *gin.Context) {
	var input userRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Data pengguna tidak lengkap atau tidak valid",
		})
		return
	}

	input.Username = strings.TrimSpace(input.Username)
	input.Role = normalizeRole(input.Role)

	if input.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Username wajib diisi",
		})
		return
	}

	if len(input.Password) < 12 || len(input.Password) > 72 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Password harus 12–72 byte",
		})
		return
	}

	if !validAdminRole(input.Role) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Role tidak valid. Role yang diperbolehkan: admin_pemkot, admin_pemkab",
		})
		return
	}

	if err := h.validateWilayah(input.Role, input.WilayahID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	var existing userRecord

	err := h.DB.Where("username = ?", input.Username).
		First(&existing).Error

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Username sudah digunakan",
		})
		return
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa username",
		})
		return
	}

	hash, err := bcrypt.GenerateFromPassword(
		[]byte(input.Password),
		bcrypt.DefaultCost,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengamankan password",
		})
		return
	}

	user := userRecord{
		Username:  input.Username,
		Password:  string(hash),
		Role:      input.Role,
		WilayahID: input.WilayahID,
	}

	if err := h.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal membuat akun pengguna",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Akun admin berhasil dibuat",
		"data":    mapUser(user),
	})
}

// PUT /api/pengguna/:id
func (h *UserHandler) UpdateUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)

	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID pengguna tidak valid",
		})
		return
	}

	var user userRecord

	if err := h.DB.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Pengguna tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data pengguna",
		})
		return
	}

	if user.Role == RoleSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Akun Super Admin tidak dapat diubah melalui endpoint ini",
		})
		return
	}

	var input userRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format data tidak valid",
		})
		return
	}

	input.Username = strings.TrimSpace(input.Username)
	input.Role = normalizeRole(input.Role)

	if input.Username == "" || !validAdminRole(input.Role) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Username atau role tidak valid",
		})
		return
	}

	if err := h.validateWilayah(input.Role, input.WilayahID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	var duplicate userRecord

	err = h.DB.
		Where("username = ? AND id <> ?", input.Username, user.ID).
		First(&duplicate).Error

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Username sudah digunakan",
		})
		return
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa username",
		})
		return
	}

	updates := map[string]interface{}{
		"username":   input.Username,
		"role":       input.Role,
		"wilayah_id": input.WilayahID,
	}

	if input.Password != "" {
		if len(input.Password) < 12 || len(input.Password) > 72 {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Password harus 12–72 byte",
			})
			return
		}

		hash, err := bcrypt.GenerateFromPassword(
			[]byte(input.Password),
			bcrypt.DefaultCost,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal mengamankan password",
			})
			return
		}

		updates["password"] = string(hash)
	}

	if err := h.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memperbarui akun",
		})
		return
	}

	user.Username = input.Username
	user.Role = input.Role
	user.WilayahID = input.WilayahID

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Akun berhasil diperbarui",
		"data":    mapUser(user),
	})
}

// DELETE /api/pengguna/:id
func (h *UserHandler) DeleteUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)

	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID pengguna tidak valid",
		})
		return
	}

	currentID, exists := c.Get("user_id")

	if exists {
		switch value := currentID.(type) {
		case uint:
			if uint64(value) == id {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": "Tidak dapat menghapus akun yang sedang digunakan",
				})
				return
			}
		case uint64:
			if value == id {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": "Tidak dapat menghapus akun yang sedang digunakan",
				})
				return
			}
		case int:
			if value > 0 && uint64(value) == id {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": "Tidak dapat menghapus akun yang sedang digunakan",
				})
				return
			}
		}
	}

	var user userRecord

	if err := h.DB.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Pengguna tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data pengguna",
		})
		return
	}

	if user.Role == RoleSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Akun Super Admin tidak dapat dihapus melalui endpoint ini",
		})
		return
	}

	if err := h.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghapus akun pengguna",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Akun admin berhasil dihapus",
	})
}

// Cakupan wilayah yang dapat dikelola Super Admin.
// Sesuaikan ID berikut dengan data aktual pada tabel wilayah.
var superAdminWilayahIDs = []uint64{1, 2, 3, 4, 5, 6, 7}

// Mengambil wilayah_id dari context autentikasi.
func contextWilayahID(c *gin.Context) (uint64, bool) {
	v, ok := c.Get("wilayah_id")
	if !ok || v == nil {
		return 0, false
	}
	switch x := v.(type) {
	case *uint64:
		if x != nil && *x > 0 {
			return *x, true
		}
	case uint64:
		if x > 0 {
			return x, true
		}
	case uint:
		if x > 0 {
			return uint64(x), true
		}
	case int:
		if x > 0 {
			return uint64(x), true
		}
	case int64:
		if x > 0 {
			return uint64(x), true
		}
	}
	return 0, false
}

// Membatasi query instansi berdasarkan role pengguna.
func applyInstansiAccess(query *gorm.DB, c *gin.Context, column string) *gorm.DB {
	role := strings.TrimSpace(c.GetString("role"))
	if role == "" {
		return query
	}
	if role == RoleSuperAdmin {
		return query.Where(column+" IN ?", superAdminWilayahIDs)
	}
	id, ok := contextWilayahID(c)
	if !ok || (role != RoleAdminPemkot && role != RoleAdminPemkab) {
		return query.Where("1 = 0")
	}
	return query.Where(column+" = ?", id)
}

// Memeriksa apakah pengguna boleh mengakses wilayah tertentu.
func canAccessWilayah(c *gin.Context, wilayahID uint64) bool {
	role := strings.TrimSpace(c.GetString("role"))
	if role == "" {
		return true
	}
	if role == RoleSuperAdmin {
		for _, id := range superAdminWilayahIDs {
			if id == wilayahID {
				return true
			}
		}
		return false
	}
	id, ok := contextWilayahID(c)
	return ok && id == wilayahID && (role == RoleAdminPemkot || role == RoleAdminPemkab)
}

func forbidden(c *gin.Context, message string) {
	c.JSON(http.StatusForbidden, gin.H{"success": false, "message": message})
}
