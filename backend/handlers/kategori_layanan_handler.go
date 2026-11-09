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

type KategoriLayananHandler struct {
	DB *gorm.DB
}

func NewKategoriLayananHandler(db *gorm.DB) *KategoriLayananHandler {
	return &KategoriLayananHandler{
		DB: db,
	}
}

// ============================================================
// GET /api/kategori-layanan
// ============================================================

func (h *KategoriLayananHandler) GetKategoriLayanan(c *gin.Context) {

	var kategori []models.KategoriLayanan

	query := h.DB.
		Model(&models.KategoriLayanan{}).
		Order("id ASC")

	if search := c.Query("search"); search != "" {
		query = query.Where(
			"nama_kategori ILIKE ? OR deskripsi ILIKE ?",
			"%"+search+"%",
			"%"+search+"%",
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

	id, err := strconv.ParseUint(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID kategori tidak valid",
		})
		return
	}

	var kategori models.KategoriLayanan

	if err := h.DB.First(
		&kategori,
		id,
	).Error; err != nil {

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
// ============================================================

type KategoriLayananRequest struct {
	NamaKategori string `json:"nama_kategori" binding:"required"`
	Deskripsi    string `json:"deskripsi"`
}

func (h *KategoriLayananHandler) CreateKategoriLayanan(c *gin.Context) {

	var input KategoriLayananRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format request tidak valid",
			"error":   err.Error(),
		})
		return
	}

	input.NamaKategori = strings.TrimSpace(
		input.NamaKategori,
	)

	input.Deskripsi = strings.TrimSpace(
		input.Deskripsi,
	)

	var existing models.KategoriLayanan

	err := h.DB.
		Where(
			"LOWER(nama_kategori) = LOWER(?)",
			input.NamaKategori,
		).
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
// ============================================================

func (h *KategoriLayananHandler) UpdateKategoriLayanan(c *gin.Context) {

	id, err := strconv.ParseUint(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID kategori tidak valid",
		})
		return
	}

	var kategori models.KategoriLayanan

	if err := h.DB.First(
		&kategori,
		id,
	).Error; err != nil {

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

	input.NamaKategori = strings.TrimSpace(
		input.NamaKategori,
	)

	input.Deskripsi = strings.TrimSpace(
		input.Deskripsi,
	)

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
// ============================================================

func (h *KategoriLayananHandler) DeleteKategoriLayanan(c *gin.Context) {

	id, err := strconv.ParseUint(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID kategori tidak valid",
		})
		return
	}

	var kategori models.KategoriLayanan

	if err := h.DB.First(
		&kategori,
		id,
	).Error; err != nil {

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

	// ========================================================
	// CEK APAKAH MASIH DIGUNAKAN LAYANAN
	// ========================================================

	var jumlahLayanan int64

	if err := h.DB.
		Model(&models.Layanan{}).
		Where("kategori_id = ?", id).
		Count(&jumlahLayanan).
		Error; err != nil {

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
