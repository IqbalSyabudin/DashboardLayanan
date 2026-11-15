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

// ============================================================
// HANDLER
// ============================================================

type KategoriLayananHandler struct {
	DB *gorm.DB
}

func NewKategoriLayananHandler(db *gorm.DB) *KategoriLayananHandler {
	return &KategoriLayananHandler{
		DB: db,
	}
}

// ============================================================
// REQUEST
// ============================================================

type KategoriLayananRequest struct {
	NamaKategori string `json:"nama_kategori" binding:"required"`
	Deskripsi    string `json:"deskripsi"`
}

// ============================================================
// HELPER: SUPER ADMIN ONLY
// ============================================================

func requireKategoriSuperAdmin(c *gin.Context) bool {
	role := strings.TrimSpace(c.GetString("role"))

	if role != "super_admin" {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Hanya Super Admin yang dapat mengelola kategori layanan",
		})
		return false
	}

	return true
}

// ============================================================
// HELPER: VALIDATE REQUEST
// ============================================================

func normalizeKategoriRequest(input *KategoriLayananRequest) {
	input.NamaKategori = strings.TrimSpace(input.NamaKategori)
	input.Deskripsi = strings.TrimSpace(input.Deskripsi)
}

// ============================================================
// GET /api/kategori-layanan
// ============================================================

func (h *KategoriLayananHandler) GetKategoriLayanan(c *gin.Context) {
	var kategori []models.KategoriLayanan

	query := h.DB.
		Model(&models.KategoriLayanan{}).
		Order("id ASC")

	search := strings.TrimSpace(c.Query("search"))

	if search != "" {
		pattern := "%" + search + "%"

		query = query.Where(
			"nama_kategori ILIKE ? OR deskripsi ILIKE ?",
			pattern,
			pattern,
		)
	}

	if err := query.Find(&kategori).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil kategori layanan",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    kategori,
	})
}

// ============================================================
// GET /api/kategori-layanan/:id
// ============================================================

func (h *KategoriLayananHandler) GetKategoriLayananByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)

	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID kategori tidak valid",
		})
		return
	}

	var kategori models.KategoriLayanan

	err = h.DB.First(&kategori, id).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Kategori layanan tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil kategori layanan",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    kategori,
	})
}

// ============================================================
// POST /api/kategori-layanan
// SUPER ADMIN ONLY
// ============================================================

func (h *KategoriLayananHandler) CreateKategoriLayanan(c *gin.Context) {
	if !requireKategoriSuperAdmin(c) {
		return
	}

	var input KategoriLayananRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format request tidak valid",
			"error":   err.Error(),
		})
		return
	}

	normalizeKategoriRequest(&input)

	if input.NamaKategori == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Nama kategori wajib diisi",
		})
		return
	}

	var existing models.KategoriLayanan

	err := h.DB.
		Where("LOWER(nama_kategori) = LOWER(?)", input.NamaKategori).
		First(&existing).
		Error

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Kategori layanan sudah ada",
		})
		return
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa kategori layanan",
			"error":   err.Error(),
		})
		return
	}

	kategori := models.KategoriLayanan{
		NamaKategori: input.NamaKategori,
		Deskripsi:    input.Deskripsi,
	}

	if err := h.DB.Create(&kategori).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal membuat kategori layanan",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Kategori layanan berhasil dibuat",
		"data":    kategori,
	})
}

// ============================================================
// PUT /api/kategori-layanan/:id
// SUPER ADMIN ONLY
// ============================================================

func (h *KategoriLayananHandler) UpdateKategoriLayanan(c *gin.Context) {
	if !requireKategoriSuperAdmin(c) {
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)

	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID kategori tidak valid",
		})
		return
	}

	var kategori models.KategoriLayanan

	err = h.DB.First(&kategori, id).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Kategori layanan tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mencari kategori layanan",
			"error":   err.Error(),
		})
		return
	}

	var input KategoriLayananRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format request tidak valid",
			"error":   err.Error(),
		})
		return
	}

	normalizeKategoriRequest(&input)

	if input.NamaKategori == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Nama kategori wajib diisi",
		})
		return
	}

	var duplicate models.KategoriLayanan

	err = h.DB.
		Where(
			"LOWER(nama_kategori) = LOWER(?) AND id <> ?",
			input.NamaKategori,
			id,
		).
		First(&duplicate).
		Error

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Nama kategori sudah digunakan oleh kategori lain",
		})
		return
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa duplikasi kategori",
			"error":   err.Error(),
		})
		return
	}

	kategori.NamaKategori = input.NamaKategori
	kategori.Deskripsi = input.Deskripsi

	if err := h.DB.Save(&kategori).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengupdate kategori layanan",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Kategori layanan berhasil diupdate",
		"data":    kategori,
	})
}

// ============================================================
// DELETE /api/kategori-layanan/:id
// SUPER ADMIN ONLY
// ============================================================

func (h *KategoriLayananHandler) DeleteKategoriLayanan(c *gin.Context) {
	if !requireKategoriSuperAdmin(c) {
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)

	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID kategori tidak valid",
		})
		return
	}

	var kategori models.KategoriLayanan

	err = h.DB.First(&kategori, id).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Kategori layanan tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mencari kategori layanan",
			"error":   err.Error(),
		})
		return
	}

	// Periksa apakah kategori masih digunakan oleh layanan.
	var jumlahLayanan int64

	err = h.DB.
		Model(&models.Layanan{}).
		Where("kategori_id = ?", id).
		Count(&jumlahLayanan).
		Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa penggunaan kategori",
			"error":   err.Error(),
		})
		return
	}

	if jumlahLayanan > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success":        false,
			"message":        "Kategori layanan tidak dapat dihapus karena masih digunakan oleh layanan",
			"jumlah_layanan": jumlahLayanan,
		})
		return
	}

	if err := h.DB.Delete(&kategori).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghapus kategori layanan",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Kategori layanan berhasil dihapus",
		"data":    kategori,
	})
}
