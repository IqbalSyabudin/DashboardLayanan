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
// GET /api/wilayah
// ============================================================

func (h *WilayahHandler) GetWilayah(c *gin.Context) {

	var wilayah []models.Wilayah

	query := h.DB.
		Model(&models.Wilayah{}).
		Order("id ASC")

	if search := c.Query("search"); search != "" {
		query = query.Where(
			"nama ILIKE ? OR tipe ILIKE ?",
			"%"+search+"%",
			"%"+search+"%",
		)
	}

	if err := query.Find(&wilayah).Error; err != nil {
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

	if err != nil {
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
// ============================================================

type WilayahRequest struct {
	Nama string `json:"nama" binding:"required"`
	Tipe string `json:"tipe" binding:"required"`
}

func (h *WilayahHandler) CreateWilayah(c *gin.Context) {

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
// ============================================================

func (h *WilayahHandler) UpdateWilayah(c *gin.Context) {

	id, err := strconv.ParseUint(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
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
// ============================================================

func (h *WilayahHandler) DeleteWilayah(c *gin.Context) {

	id, err := strconv.ParseUint(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
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
