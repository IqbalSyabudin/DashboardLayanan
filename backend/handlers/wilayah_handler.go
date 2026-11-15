package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"endpoint_api/models"
)

type WilayahHandler struct {
	DB *gorm.DB
}

func NewWilayahHandler(db *gorm.DB) *WilayahHandler {
	return &WilayahHandler{
		DB: db,
	}
}

// ============================================================
// HELPER ROLE DAN WILAYAH
// ============================================================

// Mengambil wilayah_id dari context autentikasi.
func getUserWilayahID(c *gin.Context) (uint64, bool) {
	value, exists := c.Get("wilayah_id")

	if !exists || value == nil {
		return 0, false
	}

	switch wilayahID := value.(type) {
	case *uint64:
		if wilayahID == nil || *wilayahID == 0 {
			return 0, false
		}
		return *wilayahID, true

	case uint64:
		if wilayahID == 0 {
			return 0, false
		}
		return wilayahID, true

	case uint:
		if wilayahID == 0 {
			return 0, false
		}
		return uint64(wilayahID), true

	case int:
		if wilayahID <= 0 {
			return 0, false
		}
		return uint64(wilayahID), true

	default:
		return 0, false
	}
}

// Membatasi query berdasarkan wilayah akun.
func applyWilayahScope(
	query *gorm.DB,
	c *gin.Context,
) *gorm.DB {

	role := c.GetString("role")

	// Pengunjung publik melihat seluruh wilayah; Super Admin hanya DIY dan Pusat.
	if role == "" {
		return query
	}
	if role == RoleSuperAdmin {
		return query.Where("id IN ?", superAdminWilayahIDs)
	}

	wilayahID, valid := getUserWilayahID(c)

	if !valid {
		return query.Where("1 = 0")
	}

	return query.Where("id = ?", wilayahID)
}

// Memastikan hanya Super Admin yang dapat mengelola wilayah.
func requireSuperAdmin(c *gin.Context) bool {
	if c.GetString("role") == "super_admin" {
		return true
	}

	c.JSON(http.StatusForbidden, gin.H{
		"success": false,
		"message": "Akses ditolak. Hanya Super Admin yang dapat mengelola data wilayah",
	})

	return false
}

// ============================================================
// REQUEST
// ============================================================

type WilayahRequest struct {
	Nama string `json:"nama" binding:"required"`
	Tipe string `json:"tipe" binding:"required"`
}

// ============================================================
// GET /api/wilayah
// ============================================================

func (h *WilayahHandler) GetWilayah(c *gin.Context) {

	var wilayah []models.Wilayah

	query := h.DB.
		Model(&models.Wilayah{})

	// PEMBATASAN WILAYAH BERDASARKAN AKUN
	query = applyWilayahScope(query, c)

	// SEARCH
	search := strings.TrimSpace(c.Query("search"))

	if search != "" {
		pattern := "%" + search + "%"

		query = query.Where(
			"nama ILIKE ? OR tipe ILIKE ?",
			pattern,
			pattern,
		)
	}

	if err := query.
		Order("id ASC").
		Find(&wilayah).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data wilayah",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    wilayah,
	})
}

// ============================================================
// GET /api/wilayah/:id
// ============================================================

func (h *WilayahHandler) GetWilayahByID(c *gin.Context) {

	id, err := strconv.ParseUint(
		c.Param("id"),
		10,
		64,
	)

	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID wilayah tidak valid",
		})
		return
	}

	var wilayah models.Wilayah

	query := h.DB.
		Model(&models.Wilayah{}).
		Where("id = ?", id)

	// PEMBATASAN WILAYAH BERDASARKAN AKUN
	query = applyWilayahScope(query, c)

	if err := query.First(&wilayah).Error; err != nil {

		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Wilayah tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil wilayah",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    wilayah,
	})
}

// ============================================================
// POST /api/wilayah
// SUPER ADMIN ONLY
// ============================================================

func (h *WilayahHandler) CreateWilayah(c *gin.Context) {

	if !requireSuperAdmin(c) {
		return
	}

	var input WilayahRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format request tidak valid",
			"error":   err.Error(),
		})
		return
	}

	input.Nama = strings.TrimSpace(input.Nama)
	input.Tipe = strings.TrimSpace(input.Tipe)

	if input.Nama == "" || input.Tipe == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Nama dan tipe wilayah wajib diisi",
		})
		return
	}

	// CEK DUPLIKASI
	var existing models.Wilayah

	err := h.DB.
		Where(
			"LOWER(nama) = LOWER(?) AND LOWER(tipe) = LOWER(?)",
			input.Nama,
			input.Tipe,
		).
		First(&existing).
		Error

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Wilayah dengan nama dan tipe tersebut sudah ada",
		})
		return
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa wilayah",
			"error":   err.Error(),
		})
		return
	}

	// CREATE WILAYAH
	wilayah := models.Wilayah{
		Nama: input.Nama,
		Tipe: input.Tipe,
	}

	if err := h.DB.Create(&wilayah).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal membuat wilayah",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Wilayah berhasil dibuat",
		"data":    wilayah,
	})
}

// ============================================================
// PUT /api/wilayah/:id
// SUPER ADMIN ONLY
// ============================================================

func (h *WilayahHandler) UpdateWilayah(c *gin.Context) {

	if !requireSuperAdmin(c) {
		return
	}

	id, err := strconv.ParseUint(
		c.Param("id"),
		10,
		64,
	)

	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID wilayah tidak valid",
		})
		return
	}

	var wilayah models.Wilayah

	if err := h.DB.First(&wilayah, id).Error; err != nil {

		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Wilayah tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mencari wilayah",
			"error":   err.Error(),
		})
		return
	}

	var input WilayahRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format request tidak valid",
			"error":   err.Error(),
		})
		return
	}

	input.Nama = strings.TrimSpace(input.Nama)
	input.Tipe = strings.TrimSpace(input.Tipe)

	if input.Nama == "" || input.Tipe == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Nama dan tipe wilayah wajib diisi",
		})
		return
	}

	// CEK DUPLIKASI
	var duplicate models.Wilayah

	err = h.DB.
		Where(
			"LOWER(nama) = LOWER(?) AND LOWER(tipe) = LOWER(?) AND id <> ?",
			input.Nama,
			input.Tipe,
			id,
		).
		First(&duplicate).
		Error

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Wilayah dengan nama dan tipe tersebut sudah digunakan",
		})
		return
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa duplikasi wilayah",
			"error":   err.Error(),
		})
		return
	}

	// UPDATE WILAYAH
	wilayah.Nama = input.Nama
	wilayah.Tipe = input.Tipe

	if err := h.DB.Save(&wilayah).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengupdate wilayah",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Wilayah berhasil diupdate",
		"data":    wilayah,
	})
}

// ============================================================
// DELETE /api/wilayah/:id
// SUPER ADMIN ONLY
// ============================================================

func (h *WilayahHandler) DeleteWilayah(c *gin.Context) {

	if !requireSuperAdmin(c) {
		return
	}

	id, err := strconv.ParseUint(
		c.Param("id"),
		10,
		64,
	)

	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID wilayah tidak valid",
		})
		return
	}

	var wilayah models.Wilayah

	if err := h.DB.First(&wilayah, id).Error; err != nil {

		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Wilayah tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mencari wilayah",
			"error":   err.Error(),
		})
		return
	}

	// CEK INSTANSI YANG MENGGUNAKAN WILAYAH
	var jumlahInstansi int64

	if err := h.DB.
		Model(&models.Instansi{}).
		Where("wilayah_id = ?", id).
		Count(&jumlahInstansi).
		Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa penggunaan wilayah",
			"error":   err.Error(),
		})
		return
	}

	if jumlahInstansi > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success":         false,
			"message":         "Wilayah tidak dapat dihapus karena masih digunakan oleh instansi",
			"jumlah_instansi": jumlahInstansi,
		})
		return
	}

	// DELETE WILAYAH
	if err := h.DB.Delete(&wilayah).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghapus wilayah",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Wilayah berhasil dihapus",
		"data":    wilayah,
	})
}
