package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ============================================================
// HANDLER
// ============================================================

type LayananStatusHandler struct {
	DB *gorm.DB
}

func NewLayananStatusHandler(
	db *gorm.DB,
) *LayananStatusHandler {

	return &LayananStatusHandler{
		DB: db,
	}
}

// ============================================================
// RESPONSE
// ============================================================

type LayananStatusResponse struct {
	ID uint64 `json:"id"`

	LayananID uint64 `json:"layanan_id"`

	Status string `json:"status"`

	Catatan *string `json:"catatan"`

	CheckedAt *time.Time `json:"checked_at"`

	KodeLayanan string `json:"kode_layanan"`

	NamaLayanan string `json:"nama_layanan"`

	NamaInstansi string `json:"nama_instansi"`

	Wilayah string `json:"wilayah"`
}

// ============================================================
// SUMMARY
// ============================================================

type LayananStatusSummary struct {
	Total      int64 `json:"total"`
	Verified   int64 `json:"verified"`
	NeedReview int64 `json:"need_review"`
	ReadyRAG   int64 `json:"ready_rag"`
	Cleaned    int64 `json:"cleaned"`
	Raw        int64 `json:"raw"`
}

// ============================================================
// GET /api/layanan-status
// ============================================================
//
// Query:
//
// /api/layanan-status
//
// /api/layanan-status?page=1&limit=10
//
// /api/layanan-status?search=KIA
//
// /api/layanan-status?status=VERIFIED
//
// ============================================================

func (h *LayananStatusHandler) GetLayananStatus(
	c *gin.Context,
) {

	// ========================================================
	// QUERY PARAMETER
	// ========================================================

	search :=
		strings.TrimSpace(
			c.Query("search"),
		)

	statusFilter :=
		strings.TrimSpace(
			c.Query("status"),
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
			Table("layanan_status ls").
			Joins(`
				LEFT JOIN layanan l
					ON l.id = ls.layanan_id
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
				ls.status ILIKE ?

				OR COALESCE(ls.catatan, '') ILIKE ?

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
				pattern,
			)
	}

	// ========================================================
	// FILTER STATUS
	// ========================================================

	if statusFilter != "" {

		query =
			query.Where(
				"UPPER(ls.status) = UPPER(?)",
				statusFilter,
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
				"message": "Gagal menghitung data status layanan",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// DATA
	// ========================================================

	var rows []LayananStatusResponse

	err =
		query.
			Select(`
				ls.id,
				ls.layanan_id,
				ls.status,
				ls.catatan,
				ls.checked_at,

				l.kode_layanan,
				l.nama_layanan,

				i.nama_instansi,

				w.nama AS wilayah
			`).
			Order(
				"ls.id ASC",
			).
			Limit(
				limit,
			).
			Offset(
				offset,
			).
			Scan(
				&rows,
			).
			Error

	if err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mengambil data status layanan",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// TOTAL PAGES
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
// GET /api/layanan-status/summary
// ============================================================

func (h *LayananStatusHandler) GetLayananStatusSummary(
	c *gin.Context,
) {

	var summary LayananStatusSummary

	err :=
		h.DB.
			Table("layanan_status").
			Select(`
				COUNT(*) AS total,

				COUNT(*) FILTER (
					WHERE UPPER(status) = 'VERIFIED'
				) AS verified,

				COUNT(*) FILTER (
					WHERE UPPER(status) = 'NEED_REVIEW'
				) AS need_review,

				COUNT(*) FILTER (
					WHERE UPPER(status) = 'READY_RAG'
				) AS ready_rag,

				COUNT(*) FILTER (
					WHERE UPPER(status) = 'CLEANED'
				) AS cleaned,

				COUNT(*) FILTER (
					WHERE UPPER(status) = 'RAW'
				) AS raw
			`).
			Scan(
				&summary,
			).
			Error

	if err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mengambil statistik status layanan",
				"error":   err.Error(),
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"success": true,
			"data":    summary,
		},
	)
}

// ============================================================
// GET /api/layanan-status/:id
// ============================================================

func (h *LayananStatusHandler) GetLayananStatusByID(
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
				"message": "ID status tidak valid",
			},
		)

		return
	}

	var row LayananStatusResponse

	result :=
		h.DB.
			Table("layanan_status ls").
			Joins(`
				LEFT JOIN layanan l
					ON l.id = ls.layanan_id
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
				ls.id,
				ls.layanan_id,
				ls.status,
				ls.catatan,
				ls.checked_at,

				l.kode_layanan,
				l.nama_layanan,

				i.nama_instansi,

				w.nama AS wilayah
			`).
			Where(
				"ls.id = ?",
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
				"message": "Gagal mengambil detail status",
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
				"message": "Status layanan tidak ditemukan",
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
