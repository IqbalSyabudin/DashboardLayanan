package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ============================================================
// HANDLER
// ============================================================

type LayananKeywordHandler struct {
	DB *gorm.DB
}

func NewLayananKeywordHandler(db *gorm.DB) *LayananKeywordHandler {
	return &LayananKeywordHandler{DB: db}
}

// ============================================================
// REQUEST
// ============================================================

type LayananKeywordRequest struct {
	LayananID uint64 `json:"layanan_id" binding:"required"`
	Keyword   string `json:"keyword" binding:"required"`
}

// ============================================================
// RESPONSE
// ============================================================

type LayananKeywordResponse struct {
	ID           uint64 `json:"id"`
	LayananID    uint64 `json:"layanan_id"`
	Keyword      string `json:"keyword"`
	KodeLayanan  string `json:"kode_layanan"`
	NamaLayanan  string `json:"nama_layanan"`
	NamaInstansi string `json:"nama_instansi"`
	Wilayah      string `json:"wilayah"`
}

// ============================================================
// SUMMARY
// ============================================================

type LayananKeywordSummary struct {
	TotalKeyword        int64 `json:"total_keyword"`
	KeywordUnik         int64 `json:"keyword_unik"`
	TotalLayanan        int64 `json:"total_layanan"`
	LayananPunyaKeyword int64 `json:"layanan_punya_keyword"`
}

// ============================================================
// HELPER
// ============================================================

func normalizeKeywordValue(value string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
}

// Mengambil wilayah_id dari context middleware.
func getKeywordWilayahID(c *gin.Context) (uint64, bool) {
	value, exists := c.Get("wilayah_id")
	if !exists || value == nil {
		return 0, false
	}

	switch v := value.(type) {
	case uint64:
		return v, v > 0
	case uint:
		return uint64(v), v > 0
	case int:
		if v > 0 {
			return uint64(v), true
		}
	case int64:
		if v > 0 {
			return uint64(v), true
		}
	case *uint64:
		if v != nil && *v > 0 {
			return *v, true
		}
	case *uint:
		if v != nil && *v > 0 {
			return uint64(*v), true
		}
	case *int:
		if v != nil && *v > 0 {
			return uint64(*v), true
		}
	}

	return 0, false
}

// Membatasi query keyword berdasarkan wilayah admin.
func applyKeywordWilayahScope(query *gorm.DB, c *gin.Context) *gorm.DB {
	role := strings.TrimSpace(c.GetString("role"))
	if role == "" {
		return query
	}
	if role == RoleSuperAdmin {
		return query.Where(`EXISTS (SELECT 1 FROM layanan l_scope JOIN instansi i_scope ON i_scope.id=l_scope.instansi_id WHERE l_scope.id=lk.layanan_id AND i_scope.wilayah_id IN ?)`, superAdminWilayahIDs)
	}
	id, ok := getKeywordWilayahID(c)
	if !ok || (role != RoleAdminPemkot && role != RoleAdminPemkab) {
		return query.Where("1 = 0")
	}
	return query.Where(`EXISTS (SELECT 1 FROM layanan l_scope JOIN instansi i_scope ON i_scope.id=l_scope.instansi_id WHERE l_scope.id=lk.layanan_id AND i_scope.wilayah_id = ?)`, id)
}

// Memeriksa apakah layanan berada di wilayah yang boleh dikelola.
func (h *LayananKeywordHandler) checkLayananAccess(
	c *gin.Context,
	layananID uint64,
) (bool, error) {
	query := h.DB.Table("layanan l").
		Joins("JOIN instansi i ON i.id = l.instansi_id").
		Where("l.id = ?", layananID)

	role := strings.TrimSpace(c.GetString("role"))

	if role == RoleSuperAdmin {
		query = query.Where("i.wilayah_id IN ?", superAdminWilayahIDs)
	} else if role != "" {
		wilayahID, ok := getKeywordWilayahID(c)
		if !ok {
			return false, nil
		}

		query = query.Where("i.wilayah_id = ?", wilayahID)
	}

	var count int64
	err := query.Count(&count).Error
	return count > 0, err
}

// Query dasar untuk mengambil data keyword beserta informasi layanan.
func (h *LayananKeywordHandler) baseKeywordQuery() *gorm.DB {
	return h.DB.
		Table("layanan_keyword lk").
		Joins("LEFT JOIN layanan l ON l.id = lk.layanan_id").
		Joins("LEFT JOIN instansi i ON i.id = l.instansi_id").
		Joins("LEFT JOIN wilayah w ON w.id = i.wilayah_id")
}

// ============================================================
// GET /api/layanan-keyword
// ============================================================

func (h *LayananKeywordHandler) GetLayananKeyword(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))

	keywordOnly := strings.EqualFold(
		strings.TrimSpace(c.Query("keyword_only")),
		"true",
	)

	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit

	query := applyKeywordWilayahScope(
		h.baseKeywordQuery(),
		c,
	)

	if search != "" {
		pattern := "%" + search + "%"

		if keywordOnly {
			query = query.Where("lk.keyword ILIKE ?", pattern)
		} else {
			query = query.Where(`
				(
					lk.keyword ILIKE ?
					OR l.kode_layanan ILIKE ?
					OR l.nama_layanan ILIKE ?
					OR i.nama_instansi ILIKE ?
					OR w.nama ILIKE ?
				)
			`,
				pattern,
				pattern,
				pattern,
				pattern,
				pattern,
			)
		}
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghitung data kata kunci",
			"error":   err.Error(),
		})
		return
	}

	var rows []LayananKeywordResponse

	err = query.
		Select(`
			lk.id,
			lk.layanan_id,
			lk.keyword,
			l.kode_layanan,
			l.nama_layanan,
			i.nama_instansi,
			w.nama AS wilayah
		`).
		Order("lk.id ASC").
		Limit(limit).
		Offset(offset).
		Scan(&rows).
		Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data kata kunci",
			"error":   err.Error(),
		})
		return
	}

	totalPages := 0
	if total > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
		"data": rows,
	})
}

// ============================================================
// GET /api/layanan-keyword/summary
// ============================================================

func (h *LayananKeywordHandler) GetLayananKeywordSummary(c *gin.Context) {
	var summary LayananKeywordSummary

	// Seluruh perhitungan menggunakan scope wilayah yang sama.
	query := applyKeywordWilayahScope(
		h.baseKeywordQuery(),
		c,
	)

	err := query.
		Select(`
			COUNT(DISTINCT lk.id) AS total_keyword,
			COUNT(DISTINCT LOWER(TRIM(lk.keyword))) AS keyword_unik,
			COUNT(DISTINCT l.id) AS total_layanan,
			COUNT(DISTINCT lk.layanan_id) AS layanan_punya_keyword
		`).
		Scan(&summary).
		Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil statistik kata kunci",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summary,
	})
}

// ============================================================
// GET /api/layanan-keyword/:id
// ============================================================

func (h *LayananKeywordHandler) GetLayananKeywordByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID kata kunci tidak valid",
		})
		return
	}

	var row LayananKeywordResponse

	result := applyKeywordWilayahScope(
		h.baseKeywordQuery(),
		c,
	).
		Select(`
			lk.id,
			lk.layanan_id,
			lk.keyword,
			l.kode_layanan,
			l.nama_layanan,
			i.nama_instansi,
			w.nama AS wilayah
		`).
		Where("lk.id = ?", id).
		Limit(1).
		Scan(&row)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil detail kata kunci",
			"error":   result.Error.Error(),
		})
		return
	}

	if row.ID == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Kata kunci tidak ditemukan",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    row,
	})
}

// ============================================================
// POST /api/layanan-keyword
// ============================================================

func (h *LayananKeywordHandler) CreateLayananKeyword(c *gin.Context) {
	var input LayananKeywordRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format request tidak valid",
			"error":   err.Error(),
		})
		return
	}

	input.Keyword = normalizeKeywordValue(input.Keyword)

	if input.LayananID == 0 || input.Keyword == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Layanan dan kata kunci wajib diisi",
		})
		return
	}

	// Pastikan layanan ada dan berada di wilayah admin.
	allowed, err := h.checkLayananAccess(c, input.LayananID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa layanan",
			"error":   err.Error(),
		})
		return
	}

	if !allowed {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Anda tidak memiliki akses ke layanan tersebut",
		})
		return
	}

	// Cek duplikasi keyword pada layanan yang sama.
	var duplicateCount int64

	err = h.DB.
		Table("layanan_keyword").
		Where(
			"layanan_id = ? AND LOWER(TRIM(keyword)) = LOWER(TRIM(?))",
			input.LayananID,
			input.Keyword,
		).
		Count(&duplicateCount).
		Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa duplikasi kata kunci",
			"error":   err.Error(),
		})
		return
	}

	if duplicateCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Kata kunci sudah digunakan pada layanan tersebut",
		})
		return
	}

	result := h.DB.
		Table("layanan_keyword").
		Create(map[string]interface{}{
			"layanan_id": input.LayananID,
			"keyword":    input.Keyword,
		})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal membuat kata kunci",
			"error":   result.Error.Error(),
		})
		return
	}

	var row LayananKeywordResponse

	err = h.baseKeywordQuery().
		Select(`
			lk.id,
			lk.layanan_id,
			lk.keyword,
			l.kode_layanan,
			l.nama_layanan,
			i.nama_instansi,
			w.nama AS wilayah
		`).
		Where("lk.id = ?", result.RowsAffected).
		Scan(&row).
		Error

	// Ambil record terbaru berdasarkan layanan dan keyword.
	if err != nil || row.ID == 0 {
		_ = h.baseKeywordQuery().
			Select(`
				lk.id,
				lk.layanan_id,
				lk.keyword,
				l.kode_layanan,
				l.nama_layanan,
				i.nama_instansi,
				w.nama AS wilayah
			`).
			Where(
				"lk.layanan_id = ? AND LOWER(TRIM(lk.keyword)) = LOWER(TRIM(?))",
				input.LayananID,
				input.Keyword,
			).
			Order("lk.id DESC").
			Limit(1).
			Scan(&row).
			Error
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Kata kunci berhasil dibuat",
		"data":    row,
	})
}

// ============================================================
// PUT /api/layanan-keyword/:id
// ============================================================

func (h *LayananKeywordHandler) UpdateLayananKeyword(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID kata kunci tidak valid",
		})
		return
	}

	var input LayananKeywordRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format request tidak valid",
			"error":   err.Error(),
		})
		return
	}

	input.Keyword = normalizeKeywordValue(input.Keyword)

	if input.LayananID == 0 || input.Keyword == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Layanan dan kata kunci wajib diisi",
		})
		return
	}

	// Cari keyword lama dengan pembatasan wilayah.
	var existing struct {
		ID        uint64
		LayananID uint64
		Keyword   string
	}

	result := applyKeywordWilayahScope(
		h.DB.Table("layanan_keyword lk"),
		c,
	).
		Select("lk.id, lk.layanan_id, lk.keyword").
		Where("lk.id = ?", id).
		First(&existing)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Kata kunci tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil kata kunci",
			"error":   result.Error.Error(),
		})
		return
	}

	// Pastikan layanan tujuan juga berada di wilayah admin.
	allowed, err := h.checkLayananAccess(c, input.LayananID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa layanan",
			"error":   err.Error(),
		})
		return
	}

	if !allowed {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Anda tidak memiliki akses ke layanan tujuan",
		})
		return
	}

	// Cek duplikasi.
	var duplicateCount int64

	err = h.DB.
		Table("layanan_keyword").
		Where(`
			id <> ?
			AND layanan_id = ?
			AND LOWER(TRIM(keyword)) = LOWER(TRIM(?))
		`,
			id,
			input.LayananID,
			input.Keyword,
		).
		Count(&duplicateCount).
		Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa duplikasi kata kunci",
			"error":   err.Error(),
		})
		return
	}

	if duplicateCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Kata kunci sudah digunakan pada layanan tersebut",
		})
		return
	}

	result = h.DB.
		Table("layanan_keyword").
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"layanan_id": input.LayananID,
			"keyword":    input.Keyword,
		})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengupdate kata kunci",
			"error":   result.Error.Error(),
		})
		return
	}

	var row LayananKeywordResponse

	err = h.baseKeywordQuery().
		Select(`
			lk.id,
			lk.layanan_id,
			lk.keyword,
			l.kode_layanan,
			l.nama_layanan,
			i.nama_instansi,
			w.nama AS wilayah
		`).
		Where("lk.id = ?", id).
		Scan(&row).
		Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Kata kunci berhasil diupdate, tetapi gagal mengambil data terbaru",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Kata kunci berhasil diupdate",
		"data":    row,
	})
}

// ============================================================
// DELETE /api/layanan-keyword/:id
// ============================================================

func (h *LayananKeywordHandler) DeleteLayananKeyword(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID kata kunci tidak valid",
		})
		return
	}

	// Cari record dengan pembatasan wilayah.
	var row struct {
		ID        uint64 `json:"id"`
		LayananID uint64 `json:"layanan_id"`
		Keyword   string `json:"keyword"`
	}

	result := applyKeywordWilayahScope(
		h.DB.Table("layanan_keyword lk"),
		c,
	).
		Select("lk.id, lk.layanan_id, lk.keyword").
		Where("lk.id = ?", id).
		First(&row)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Kata kunci tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mencari kata kunci",
			"error":   result.Error.Error(),
		})
		return
	}

	result = h.DB.
		Table("layanan_keyword").
		Where("id = ?", id).
		Delete(nil)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghapus kata kunci",
			"error":   result.Error.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Kata kunci berhasil dihapus",
		"data": gin.H{
			"id":         row.ID,
			"layanan_id": row.LayananID,
			"keyword":    row.Keyword,
		},
	})
}
