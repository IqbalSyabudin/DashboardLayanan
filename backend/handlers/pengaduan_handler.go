package handlers

import (
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"endpoint_api/models"
)

// ============================================================
// HANDLER
// ============================================================

type PengaduanHandler struct {
	DB *gorm.DB
}

func NewPengaduanHandler(db *gorm.DB) *PengaduanHandler {
	return &PengaduanHandler{DB: db}
}

// ============================================================
// REQUEST
// ============================================================

type PengaduanRequest struct {
	NamaPelapor    string  `json:"nama_pelapor" binding:"required"`
	KontakPelapor  string  `json:"kontak_pelapor"`
	WilayahID      *uint64 `json:"wilayah_id"`
	OPDTujuan      string  `json:"opd_tujuan"`
	JudulPengaduan string  `json:"judul_pengaduan" binding:"required"`
	IsiLaporanWarga string `json:"isi_laporan_warga"`
	Status         string  `json:"status"`
	TanggapanAdmin string  `json:"tanggapan_admin"`
	Sumber         string  `json:"sumber"`
}

// ============================================================
// HELPER: Generate Nomor Aduan
// ============================================================

func (h *PengaduanHandler) generateNoAduan(wilayahID *uint64) (string, error) {
	// Kode wilayah default
	kodeWilayah := "DIY"

	if wilayahID != nil && *wilayahID > 0 {
		var wilayah models.Wilayah
		if err := h.DB.First(&wilayah, *wilayahID).Error; err == nil {
			nama := strings.ToUpper(wilayah.Nama)
			switch {
			case strings.Contains(nama, "SLEMAN"):
				kodeWilayah = "SLM"
			case strings.Contains(nama, "BANTUL"):
				kodeWilayah = "BTL"
			case strings.Contains(nama, "GUNUNGKIDUL"):
				kodeWilayah = "GNK"
			case strings.Contains(nama, "KULON PROGO"):
				kodeWilayah = "KLP"
			case strings.Contains(nama, "YOGYAKARTA"):
				kodeWilayah = "YK"
			case strings.Contains(nama, "PUSAT"):
				kodeWilayah = "PST"
			default:
				kodeWilayah = "DIY"
			}
		}
	}

	tahun := time.Now().Year()

	// Hitung urutan
	var count int64
	h.DB.Model(&models.Pengaduan{}).
		Where("EXTRACT(YEAR FROM created_at) = ?", tahun).
		Count(&count)

	urut := count + 1
	noAduan := fmt.Sprintf("PGD-%s-%d-%03d", kodeWilayah, tahun, urut)

	return noAduan, nil
}

// ============================================================
// GET /api/pengaduan
// ============================================================

func (h *PengaduanHandler) GetPengaduan(c *gin.Context) {

	// PAGINATION
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit

	query := h.DB.Model(&models.Pengaduan{})

	// FILTER STATUS
	status := strings.TrimSpace(c.Query("status"))
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// SEARCH
	search := strings.TrimSpace(c.Query("search"))
	if search != "" {
		pattern := "%" + search + "%"
		query = query.Where(
			"no_aduan ILIKE ? OR nama_pelapor ILIKE ? OR judul_pengaduan ILIKE ? OR opd_tujuan ILIKE ?",
			pattern, pattern, pattern, pattern,
		)
	}

	// COUNT
	var total int64
	query.Count(&total)

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	if totalPages < 1 {
		totalPages = 1
	}

	// DATA
	var pengaduan []models.Pengaduan

	if err := query.
		Preload("Wilayah").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&pengaduan).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data pengaduan",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    pengaduan,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// ============================================================
// GET /api/pengaduan/summary
// ============================================================

func (h *PengaduanHandler) GetPengaduanSummary(c *gin.Context) {

	type StatusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}

	var results []StatusCount

	if err := h.DB.Model(&models.Pengaduan{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Find(&results).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil ringkasan pengaduan",
			"error":   err.Error(),
		})
		return
	}

	var total int64
	h.DB.Model(&models.Pengaduan{}).Count(&total)

	summary := gin.H{
		"total":                total,
		"menunggu_verifikasi":  int64(0),
		"diproses_opd":         int64(0),
		"selesai":              int64(0),
		"ditolak":              int64(0),
	}

	for _, r := range results {
		switch r.Status {
		case "menunggu_verifikasi":
			summary["menunggu_verifikasi"] = r.Count
		case "diproses_opd":
			summary["diproses_opd"] = r.Count
		case "selesai":
			summary["selesai"] = r.Count
		case "ditolak":
			summary["ditolak"] = r.Count
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summary,
	})
}

// ============================================================
// GET /api/pengaduan/:id
// ============================================================

func (h *PengaduanHandler) GetPengaduanByID(c *gin.Context) {

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID pengaduan tidak valid",
		})
		return
	}

	var pengaduan models.Pengaduan

	if err := h.DB.
		Preload("Wilayah").
		First(&pengaduan, id).Error; err != nil {

		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Pengaduan tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil pengaduan",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    pengaduan,
	})
}

// ============================================================
// POST /api/pengaduan
// ============================================================

func (h *PengaduanHandler) CreatePengaduan(c *gin.Context) {

	var input PengaduanRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format request tidak valid",
			"error":   err.Error(),
		})
		return
	}

	input.NamaPelapor = strings.TrimSpace(input.NamaPelapor)
	input.JudulPengaduan = strings.TrimSpace(input.JudulPengaduan)

	if input.NamaPelapor == "" || input.JudulPengaduan == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Nama pelapor dan judul pengaduan wajib diisi",
		})
		return
	}

	// Generate nomor aduan
	noAduan, err := h.generateNoAduan(input.WilayahID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal generate nomor aduan",
			"error":   err.Error(),
		})
		return
	}

	// Set status default
	statusVal := strings.TrimSpace(input.Status)
	if statusVal == "" {
		statusVal = "menunggu_verifikasi"
	}

	// Set sumber default
	sumber := strings.TrimSpace(input.Sumber)
	if sumber == "" {
		sumber = "Input Admin (Loket / 112)"
	}

	pengaduan := models.Pengaduan{
		NoAduan:         noAduan,
		Sumber:          sumber,
		NamaPelapor:     input.NamaPelapor,
		KontakPelapor:   strings.TrimSpace(input.KontakPelapor),
		WilayahID:       input.WilayahID,
		OPDTujuan:       strings.TrimSpace(input.OPDTujuan),
		JudulPengaduan:  input.JudulPengaduan,
		IsiLaporanWarga: strings.TrimSpace(input.IsiLaporanWarga),
		Status:          statusVal,
		TanggapanAdmin:  strings.TrimSpace(input.TanggapanAdmin),
	}

	if err := h.DB.Create(&pengaduan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal membuat pengaduan",
			"error":   err.Error(),
		})
		return
	}

	// Reload with relation
	h.DB.Preload("Wilayah").First(&pengaduan, pengaduan.ID)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Pengaduan berhasil dibuat",
		"data":    pengaduan,
	})
}

// ============================================================
// PUT /api/pengaduan/:id
// ============================================================

func (h *PengaduanHandler) UpdatePengaduan(c *gin.Context) {

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID pengaduan tidak valid",
		})
		return
	}

	var pengaduan models.Pengaduan

	if err := h.DB.First(&pengaduan, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Pengaduan tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mencari pengaduan",
			"error":   err.Error(),
		})
		return
	}

	var input PengaduanRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format request tidak valid",
			"error":   err.Error(),
		})
		return
	}

	// Update fields
	pengaduan.NamaPelapor = strings.TrimSpace(input.NamaPelapor)
	pengaduan.KontakPelapor = strings.TrimSpace(input.KontakPelapor)
	pengaduan.WilayahID = input.WilayahID
	pengaduan.OPDTujuan = strings.TrimSpace(input.OPDTujuan)
	pengaduan.JudulPengaduan = strings.TrimSpace(input.JudulPengaduan)
	pengaduan.IsiLaporanWarga = strings.TrimSpace(input.IsiLaporanWarga)
	pengaduan.TanggapanAdmin = strings.TrimSpace(input.TanggapanAdmin)

	statusVal := strings.TrimSpace(input.Status)
	if statusVal != "" {
		pengaduan.Status = statusVal
	}

	if err := h.DB.Save(&pengaduan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengupdate pengaduan",
			"error":   err.Error(),
		})
		return
	}

	// Reload with relation
	h.DB.Preload("Wilayah").First(&pengaduan, pengaduan.ID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Pengaduan berhasil diperbarui",
		"data":    pengaduan,
	})
}

// ============================================================
// DELETE /api/pengaduan/:id
// ============================================================

func (h *PengaduanHandler) DeletePengaduan(c *gin.Context) {

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID pengaduan tidak valid",
		})
		return
	}

	var pengaduan models.Pengaduan

	if err := h.DB.First(&pengaduan, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Pengaduan tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mencari pengaduan",
			"error":   err.Error(),
		})
		return
	}

	if err := h.DB.Delete(&pengaduan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghapus pengaduan",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Pengaduan berhasil dihapus",
		"data":    pengaduan,
	})
}

// ============================================================
// POST /api/pengaduan/simulasi
// Simulasi aduan masuk dari chatbot
// ============================================================

func (h *PengaduanHandler) SimulasiAduan(c *gin.Context) {

	var input PengaduanRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format request tidak valid",
			"error":   err.Error(),
		})
		return
	}

	input.NamaPelapor = strings.TrimSpace(input.NamaPelapor)
	input.JudulPengaduan = strings.TrimSpace(input.JudulPengaduan)

	if input.NamaPelapor == "" || input.JudulPengaduan == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Nama pelapor dan judul pengaduan wajib diisi",
		})
		return
	}

	noAduan, err := h.generateNoAduan(input.WilayahID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal generate nomor aduan",
			"error":   err.Error(),
		})
		return
	}

	pengaduan := models.Pengaduan{
		NoAduan:         noAduan,
		Sumber:          "Otomatis (Chatbot Laras)",
		NamaPelapor:     input.NamaPelapor,
		KontakPelapor:   strings.TrimSpace(input.KontakPelapor),
		WilayahID:       input.WilayahID,
		OPDTujuan:       strings.TrimSpace(input.OPDTujuan),
		JudulPengaduan:  input.JudulPengaduan,
		IsiLaporanWarga: strings.TrimSpace(input.IsiLaporanWarga),
		Status:          "menunggu_verifikasi",
		TanggapanAdmin:  "",
	}

	if err := h.DB.Create(&pengaduan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal membuat simulasi aduan",
			"error":   err.Error(),
		})
		return
	}

	h.DB.Preload("Wilayah").First(&pengaduan, pengaduan.ID)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Simulasi aduan berhasil masuk",
		"data":    pengaduan,
	})
}
