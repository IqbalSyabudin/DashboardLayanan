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

func NewLayananKeywordHandler(
	db *gorm.DB,
) *LayananKeywordHandler {

	return &LayananKeywordHandler{
		DB: db,
	}
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
	ID uint64 `json:"id"`

	LayananID uint64 `json:"layanan_id"`

	Keyword string `json:"keyword"`

	KodeLayanan string `json:"kode_layanan"`

	NamaLayanan string `json:"nama_layanan"`

	NamaInstansi string `json:"nama_instansi"`

	Wilayah string `json:"wilayah"`
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
// HELPER NORMALIZE
// ============================================================

func normalizeKeywordValue(
	value string,
) string {

	return strings.Join(
		strings.Fields(
			strings.TrimSpace(value),
		),
		" ",
	)
}

// ============================================================
// GET /api/layanan-keyword
// ============================================================

func (h *LayananKeywordHandler) GetLayananKeyword(
	c *gin.Context,
) {

	// ========================================================
	// QUERY
	// ========================================================

	search :=
		strings.TrimSpace(
			c.Query("search"),
		)

	// ========================================================
	// PAGINATION
	// ========================================================

	page, err :=
		strconv.Atoi(
			c.DefaultQuery(
				"page",
				"1",
			),
		)

	if err != nil || page < 1 {
		page = 1
	}

	limit, err :=
		strconv.Atoi(
			c.DefaultQuery(
				"limit",
				"10",
			),
		)

	if err != nil || limit < 1 {
		limit = 10
	}

	if limit > 100 {
		limit = 100
	}

	offset :=
		(page - 1) * limit

	// ========================================================
	// BASE QUERY
	// ========================================================

	query :=
		h.DB.
			Table("layanan_keyword lk").
			Joins(`
				LEFT JOIN layanan l
					ON l.id = lk.layanan_id
			`).
			Joins(`
				LEFT JOIN instansi i
					ON i.id = l.instansi_id
			`).
			Joins(`
				LEFT JOIN wilayah w
					ON w.id = i.wilayah_id
			`)

	// ========================================================
	// SEARCH
	// ========================================================

	if search != "" {

		pattern :=
			"%" + search + "%"

		query =
			query.Where(`
				lk.keyword ILIKE ?

				OR l.kode_layanan ILIKE ?

				OR l.nama_layanan ILIKE ?

				OR i.nama_instansi ILIKE ?

				OR w.nama ILIKE ?
			`,
				pattern,
				pattern,
				pattern,
				pattern,
				pattern,
			)
	}

	// ========================================================
	// COUNT
	// ========================================================

	var total int64

	if err := query.
		Count(
			&total,
		).
		Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal menghitung data kata kunci",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// DATA
	// ========================================================

	var rows []LayananKeywordResponse

	result :=
		query.
			Select(`
				lk.id,
				lk.layanan_id,
				lk.keyword,

				l.kode_layanan,
				l.nama_layanan,

				i.nama_instansi,

				w.nama AS wilayah
			`).
			Order(
				"lk.id ASC",
			).
			Limit(
				limit,
			).
			Offset(
				offset,
			).
			Scan(
				&rows,
			)

	if result.Error != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mengambil data kata kunci",
				"error":   result.Error.Error(),
			},
		)

		return
	}

	// ========================================================
	// TOTAL PAGE
	// ========================================================

	totalPages := 0

	if total > 0 {

		totalPages =
			int(
				(total +
					int64(limit) -
					1) /
					int64(limit),
			)
	}

	// ========================================================
	// RESPONSE
	// ========================================================

	c.JSON(
		http.StatusOK,
		gin.H{
			"success": true,

			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": totalPages,
			},

			"data": rows,
		},
	)
}

// ============================================================
// GET /api/layanan-keyword/summary
// ============================================================

func (h *LayananKeywordHandler) GetLayananKeywordSummary(
	c *gin.Context,
) {

	var summary LayananKeywordSummary

	// ========================================================
	// TOTAL KEYWORD
	// ========================================================

	if err := h.DB.
		Table("layanan_keyword").
		Select(
			"COUNT(*)",
		).
		Scan(
			&summary.TotalKeyword,
		).
		Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal menghitung total kata kunci",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// KEYWORD UNIK
	// ========================================================

	if err := h.DB.
		Table("layanan_keyword").
		Select(`
			COUNT(
				DISTINCT LOWER(
					TRIM(keyword)
				)
			)
		`).
		Scan(
			&summary.KeywordUnik,
		).
		Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal menghitung keyword unik",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// TOTAL LAYANAN
	// ========================================================

	if err := h.DB.
		Table("layanan").
		Select(
			"COUNT(*)",
		).
		Scan(
			&summary.TotalLayanan,
		).
		Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal menghitung total layanan",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// LAYANAN PUNYA KEYWORD
	// ========================================================

	if err := h.DB.
		Table("layanan_keyword").
		Select(
			"COUNT(DISTINCT layanan_id)",
		).
		Scan(
			&summary.LayananPunyaKeyword,
		).
		Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal menghitung layanan ber-keyword",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// RESPONSE
	// ========================================================

	c.JSON(
		http.StatusOK,
		gin.H{
			"success": true,
			"data":    summary,
		},
	)
}

// ============================================================
// GET /api/layanan-keyword/:id
// ============================================================

func (h *LayananKeywordHandler) GetLayananKeywordByID(
	c *gin.Context,
) {

	id, err :=
		strconv.ParseUint(
			c.Param("id"),
			10,
			64,
		)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"success": false,
				"message": "ID kata kunci tidak valid",
			},
		)

		return
	}

	var row LayananKeywordResponse

	result :=
		h.DB.
			Table("layanan_keyword lk").
			Joins(`
				LEFT JOIN layanan l
					ON l.id = lk.layanan_id
			`).
			Joins(`
				LEFT JOIN instansi i
					ON i.id = l.instansi_id
			`).
			Joins(`
				LEFT JOIN wilayah w
					ON w.id = i.wilayah_id
			`).
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
				"lk.id = ?",
				id,
			).
			Scan(
				&row,
			)

	if result.Error != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mengambil detail kata kunci",
				"error":   result.Error.Error(),
			},
		)

		return
	}

	if row.ID == 0 {

		c.JSON(
			http.StatusNotFound,
			gin.H{
				"success": false,
				"message": "Kata kunci tidak ditemukan",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"success": true,
			"data":    row,
		},
	)
}

// ============================================================
// POST /api/layanan-keyword
// ============================================================

func (h *LayananKeywordHandler) CreateLayananKeyword(
	c *gin.Context,
) {

	var input LayananKeywordRequest

	if err := c.ShouldBindJSON(
		&input,
	); err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"success": false,
				"message": "Format request tidak valid",
				"error":   err.Error(),
			},
		)

		return
	}

	input.Keyword =
		normalizeKeywordValue(
			input.Keyword,
		)

	if input.Keyword == "" {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"success": false,
				"message": "Kata kunci wajib diisi",
			},
		)

		return
	}

	// ========================================================
	// VALIDASI LAYANAN
	// ========================================================

	var layananExists int64

	err :=
		h.DB.
			Table("layanan").
			Where(
				"id = ?",
				input.LayananID,
			).
			Count(
				&layananExists,
			).
			Error

	if err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal memeriksa layanan",
				"error":   err.Error(),
			},
		)

		return
	}

	if layananExists == 0 {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"success": false,
				"message": "Layanan tidak ditemukan",
			},
		)

		return
	}

	// ========================================================
	// CEK DUPLIKAT
	// ========================================================

	var duplicateCount int64

	err =
		h.DB.
			Table("layanan_keyword").
			Where(
				"layanan_id = ? AND LOWER(TRIM(keyword)) = LOWER(TRIM(?))",
				input.LayananID,
				input.Keyword,
			).
			Count(
				&duplicateCount,
			).
			Error

	if err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal memeriksa duplikasi kata kunci",
				"error":   err.Error(),
			},
		)

		return
	}

	if duplicateCount > 0 {

		c.JSON(
			http.StatusConflict,
			gin.H{
				"success": false,
				"message": "Kata kunci sudah digunakan pada layanan tersebut",
			},
		)

		return
	}

	// ========================================================
	// INSERT
	// ========================================================

	result :=
		h.DB.
			Table("layanan_keyword").
			Create(
				map[string]interface{}{
					"layanan_id": input.LayananID,
					"keyword":    input.Keyword,
				},
			)

	if result.Error != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal membuat kata kunci",
				"error":   result.Error.Error(),
			},
		)

		return
	}

	// ========================================================
	// AMBIL RECORD TERBARU
	// ========================================================

	var row LayananKeywordResponse

	err =
		h.DB.
			Table("layanan_keyword lk").
			Joins(`
				LEFT JOIN layanan l
					ON l.id = lk.layanan_id
			`).
			Joins(`
				LEFT JOIN instansi i
					ON i.id = l.instansi_id
			`).
			Joins(`
				LEFT JOIN wilayah w
					ON w.id = i.wilayah_id
			`).
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
			Order(
				"lk.id DESC",
			).
			First(
				&row,
			).
			Error

	if err != nil {

		c.JSON(
			http.StatusCreated,
			gin.H{
				"success": true,
				"message": "Kata kunci berhasil dibuat",
			},
		)

		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"success": true,
			"message": "Kata kunci berhasil dibuat",
			"data":    row,
		},
	)
}

// ============================================================
// PUT /api/layanan-keyword/:id
// ============================================================

func (h *LayananKeywordHandler) UpdateLayananKeyword(
	c *gin.Context,
) {

	id, err :=
		strconv.ParseUint(
			c.Param("id"),
			10,
			64,
		)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"success": false,
				"message": "ID kata kunci tidak valid",
			},
		)

		return
	}

	var input LayananKeywordRequest

	if err := c.ShouldBindJSON(
		&input,
	); err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"success": false,
				"message": "Format request tidak valid",
				"error":   err.Error(),
			},
		)

		return
	}

	input.Keyword =
		normalizeKeywordValue(
			input.Keyword,
		)

	if input.Keyword == "" {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"success": false,
				"message": "Kata kunci wajib diisi",
			},
		)

		return
	}

	// ========================================================
	// CEK RECORD
	// ========================================================

	var existing struct {
		ID        uint64
		LayananID uint64
		Keyword   string
	}

	result :=
		h.DB.
			Table("layanan_keyword").
			Select(
				"id, layanan_id, keyword",
			).
			Where(
				"id = ?",
				id,
			).
			First(
				&existing,
			)

	if result.Error != nil {

		if errors.Is(
			result.Error,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(
				http.StatusNotFound,
				gin.H{
					"success": false,
					"message": "Kata kunci tidak ditemukan",
				},
			)

			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mengambil kata kunci",
				"error":   result.Error.Error(),
			},
		)

		return
	}

	// ========================================================
	// VALIDASI LAYANAN
	// ========================================================

	var layananExists int64

	if err := h.DB.
		Table("layanan").
		Where(
			"id = ?",
			input.LayananID,
		).
		Count(
			&layananExists,
		).
		Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal memeriksa layanan",
				"error":   err.Error(),
			},
		)

		return
	}

	if layananExists == 0 {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"success": false,
				"message": "Layanan tidak ditemukan",
			},
		)

		return
	}

	// ========================================================
	// DUPLICATE
	// ========================================================

	var duplicateCount int64

	err =
		h.DB.
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
			Count(
				&duplicateCount,
			).
			Error

	if err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal memeriksa duplikasi kata kunci",
				"error":   err.Error(),
			},
		)

		return
	}

	if duplicateCount > 0 {

		c.JSON(
			http.StatusConflict,
			gin.H{
				"success": false,
				"message": "Kata kunci sudah digunakan pada layanan tersebut",
			},
		)

		return
	}

	// ========================================================
	// UPDATE
	// ========================================================

	result =
		h.DB.
			Table("layanan_keyword").
			Where(
				"id = ?",
				id,
			).
			Updates(
				map[string]interface{}{
					"layanan_id": input.LayananID,
					"keyword":    input.Keyword,
				},
			)

	if result.Error != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mengupdate kata kunci",
				"error":   result.Error.Error(),
			},
		)

		return
	}

	// ========================================================
	// RESPONSE
	// ========================================================

	var row LayananKeywordResponse

	err =
		h.DB.
			Table("layanan_keyword lk").
			Joins(`
				LEFT JOIN layanan l
					ON l.id = lk.layanan_id
			`).
			Joins(`
				LEFT JOIN instansi i
					ON i.id = l.instansi_id
			`).
			Joins(`
				LEFT JOIN wilayah w
					ON w.id = i.wilayah_id
			`).
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
				"lk.id = ?",
				id,
			).
			Scan(
				&row,
			).
			Error

	if err != nil {

		c.JSON(
			http.StatusOK,
			gin.H{
				"success": true,
				"message": "Kata kunci berhasil diupdate",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"success": true,
			"message": "Kata kunci berhasil diupdate",
			"data":    row,
		},
	)
}

// ============================================================
// DELETE /api/layanan-keyword/:id
// ============================================================

func (h *LayananKeywordHandler) DeleteLayananKeyword(
	c *gin.Context,
) {

	id, err :=
		strconv.ParseUint(
			c.Param("id"),
			10,
			64,
		)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"success": false,
				"message": "ID kata kunci tidak valid",
			},
		)

		return
	}

	// ========================================================
	// CARI RECORD
	// ========================================================

	var row struct {
		ID        uint64 `json:"id"`
		LayananID uint64 `json:"layanan_id"`
		Keyword   string `json:"keyword"`
	}

	result :=
		h.DB.
			Table("layanan_keyword").
			Select(
				"id, layanan_id, keyword",
			).
			Where(
				"id = ?",
				id,
			).
			First(
				&row,
			)

	if result.Error != nil {

		if errors.Is(
			result.Error,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(
				http.StatusNotFound,
				gin.H{
					"success": false,
					"message": "Kata kunci tidak ditemukan",
				},
			)

			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mencari kata kunci",
				"error":   result.Error.Error(),
			},
		)

		return
	}

	// ========================================================
	// DELETE
	// ========================================================

	if err := h.DB.
		Table("layanan_keyword").
		Where(
			"id = ?",
			id,
		).
		Delete(
			nil,
		).
		Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal menghapus kata kunci",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// RESPONSE
	// ========================================================

	c.JSON(
		http.StatusOK,
		gin.H{
			"success": true,
			"message": "Kata kunci berhasil dihapus",
			"data": gin.H{
				"id":         row.ID,
				"layanan_id": row.LayananID,
				"keyword":    row.Keyword,
			},
		},
	)
}
