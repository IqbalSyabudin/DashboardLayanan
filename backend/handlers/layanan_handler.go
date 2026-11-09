package handlers

import (
	"errors"
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

type LayananHandler struct {
	DB *gorm.DB
}

func NewLayananHandler(db *gorm.DB) *LayananHandler {
	return &LayananHandler{
		DB: db,
	}
}

// ============================================================
// REQUEST CREATE / UPDATE LAYANAN
// ============================================================

type CreateLayananRequest struct {
	KodeLayanan string `json:"kode_layanan" binding:"required"`
	NamaLayanan string `json:"nama_layanan" binding:"required"`
	Status      string `json:"status" binding:"required"`

	InstansiID uint64 `json:"instansi_id" binding:"required"`
	KategoriID uint64 `json:"kategori_id" binding:"required"`

	Detail *CreateDetailRequest `json:"detail"`

	Sumber []CreateSumberRequest `json:"sumber"`

	Keywords []string `json:"keywords"`

	StatusKnowledge *CreateStatusRequest `json:"status_knowledge"`
}

// ============================================================
// DETAIL REQUEST
// ============================================================

type CreateDetailRequest struct {
	Deskripsi     string `json:"deskripsi"`
	KebutuhanUser string `json:"kebutuhan_user"`
	Persyaratan   string `json:"persyaratan"`
	Prosedur      string `json:"prosedur"`
	Kanal         string `json:"kanal"`
}

// ============================================================
// SUMBER REQUEST
// ============================================================

type CreateSumberRequest struct {
	URL        string     `json:"url"`
	TipeSumber string     `json:"tipe_sumber"`
	VerifiedAt *time.Time `json:"verified_at"`
}

// ============================================================
// STATUS KNOWLEDGE REQUEST
// ============================================================

type CreateStatusRequest struct {
	Status    string     `json:"status"`
	Catatan   string     `json:"catatan"`
	CheckedAt *time.Time `json:"checked_at"`
}

// ============================================================
// HELPER PRELOAD
// ============================================================

func preloadLayanan(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Instansi").
		Preload("Instansi.Wilayah").
		Preload("Instansi.Level").
		Preload("Kategori").
		Preload("Detail").
		Preload("Sumber").
		Preload("Keywords").
		Preload("Statuses").
		Preload("Embedding").
		Preload("Monitoring")
}

// ============================================================
// GET /api/layanan
// Search + Filter + Pagination + Relasi
// ============================================================

func (h *LayananHandler) GetLayanans(c *gin.Context) {

	var layanans []models.Layanan

	// ========================================================
	// QUERY PARAMETER
	// ========================================================

	search := strings.TrimSpace(
		c.Query("search"),
	)

	wilayah := strings.TrimSpace(
		c.Query("wilayah"),
	)

	kategori := strings.TrimSpace(
		c.Query("kategori"),
	)

	status := strings.TrimSpace(
		c.Query("status"),
	)

	knowledgeStatus := strings.TrimSpace(
		c.Query("knowledge_status"),
	)

	// ========================================================
	// PAGINATION
	// ========================================================

	page, err := strconv.Atoi(
		c.DefaultQuery("page", "1"),
	)

	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(
		c.DefaultQuery("limit", "10"),
	)

	if err != nil || limit < 1 {
		limit = 10
	}

	if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit

	// ========================================================
	// BASE QUERY
	// ========================================================

	query := h.DB.
		Model(&models.Layanan{}).
		Table("layanan")

	// ========================================================
	// SEARCH
	// ========================================================

	if search != "" {

		searchPattern :=
			"%" + search + "%"

		query = query.Where(`
			layanan.nama_layanan ILIKE ?
			OR layanan.kode_layanan ILIKE ?

			OR EXISTS (
				SELECT 1
				FROM instansi i
				WHERE i.id = layanan.instansi_id
				AND (
					i.nama_instansi ILIKE ?
					OR i.singkatan ILIKE ?
					OR i.kode_instansi ILIKE ?
				)
			)

			OR EXISTS (
				SELECT 1
				FROM instansi i
				JOIN wilayah w
					ON w.id = i.wilayah_id
				WHERE i.id = layanan.instansi_id
				AND (
					w.nama ILIKE ?
					OR w.tipe ILIKE ?
				)
			)

			OR EXISTS (
				SELECT 1
				FROM kategori_layanan k
				WHERE k.id = layanan.kategori_id
				AND (
					k.nama_kategori ILIKE ?
					OR k.deskripsi ILIKE ?
				)
			)

			OR EXISTS (
				SELECT 1
				FROM layanan_detail d
				WHERE d.layanan_id = layanan.id
				AND (
					d.deskripsi ILIKE ?
					OR d.kebutuhan_user ILIKE ?
					OR d.persyaratan ILIKE ?
					OR d.prosedur ILIKE ?
					OR d.kanal ILIKE ?
				)
			)

			OR EXISTS (
				SELECT 1
				FROM layanan_keyword kw
				WHERE kw.layanan_id = layanan.id
				AND kw.keyword ILIKE ?
			)
		`,
			searchPattern, // nama_layanan
			searchPattern, // kode_layanan

			searchPattern, // instansi nama
			searchPattern, // instansi singkatan
			searchPattern, // instansi kode

			searchPattern, // wilayah nama
			searchPattern, // wilayah tipe

			searchPattern, // kategori nama
			searchPattern, // kategori deskripsi

			searchPattern, // detail deskripsi
			searchPattern, // detail kebutuhan
			searchPattern, // detail persyaratan
			searchPattern, // detail prosedur
			searchPattern, // detail kanal

			searchPattern, // keyword
		)
	}

	// ========================================================
	// FILTER WILAYAH
	// ========================================================

	if wilayah != "" {

		query = query.Where(`
			EXISTS (
				SELECT 1
				FROM instansi i
				JOIN wilayah w
					ON w.id = i.wilayah_id
				WHERE i.id = layanan.instansi_id
				AND w.nama ILIKE ?
			)
		`,
			"%"+wilayah+"%",
		)
	}

	// ========================================================
	// FILTER KATEGORI
	// ========================================================

	if kategori != "" {

		query = query.Where(`
			EXISTS (
				SELECT 1
				FROM kategori_layanan k
				WHERE k.id = layanan.kategori_id
				AND k.nama_kategori ILIKE ?
			)
		`,
			"%"+kategori+"%",
		)
	}

	// ========================================================
	// FILTER STATUS LAYANAN
	// ========================================================

	if status != "" {

		query = query.Where(
			"layanan.status ILIKE ?",
			"%"+status+"%",
		)
	}

	// ========================================================
	// FILTER KNOWLEDGE STATUS
	// ========================================================

	if knowledgeStatus != "" {

		query = query.Where(`
			EXISTS (
				SELECT 1
				FROM layanan_status ls
				WHERE ls.layanan_id = layanan.id
				AND LOWER(ls.status) = LOWER(?)
			)
		`,
			knowledgeStatus,
		)
	}

	// ========================================================
	// HITUNG TOTAL
	// ========================================================

	var total int64

	if err := query.Count(&total).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghitung data layanan",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// AMBIL DATA
	// ========================================================

	result := query.
		Order("layanan.id ASC").
		Limit(limit).
		Offset(offset)

	result = preloadLayanan(result)

	if err := result.Find(&layanans).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data layanan",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// TOTAL PAGE
	// ========================================================

	totalPages := 0

	if total > 0 {
		totalPages = int(
			(total + int64(limit) - 1) /
				int64(limit),
		)
	}

	// ========================================================
	// RESPONSE
	// ========================================================

	c.JSON(http.StatusOK, gin.H{
		"success": true,

		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},

		"data": layanans,
	})
}

// ============================================================
// GET /api/layanan/:id
// ============================================================

func (h *LayananHandler) GetLayananByID(c *gin.Context) {

	id, err := strconv.ParseUint(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID tidak valid",
		})

		return
	}

	var layanan models.Layanan

	result := preloadLayanan(
		h.DB,
	).First(
		&layanan,
		id,
	)

	if result.Error != nil {

		if errors.Is(
			result.Error,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Layanan tidak ditemukan",
			})

			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil layanan",
			"error":   result.Error.Error(),
		})

		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    layanan,
	})
}

// ============================================================
// POST /api/layanan
// ============================================================

func (h *LayananHandler) CreateLayanan(c *gin.Context) {

	var input CreateLayananRequest

	// ========================================================
	// BIND JSON
	// ========================================================

	if err := c.ShouldBindJSON(&input); err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format request tidak valid",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// NORMALISASI INPUT
	// ========================================================

	input.KodeLayanan =
		strings.TrimSpace(
			input.KodeLayanan,
		)

	input.NamaLayanan =
		strings.TrimSpace(
			input.NamaLayanan,
		)

	input.Status =
		strings.TrimSpace(
			input.Status,
		)

	// ========================================================
	// VALIDASI DASAR
	// ========================================================

	if input.KodeLayanan == "" {

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Kode layanan wajib diisi",
		})

		return
	}

	if input.NamaLayanan == "" {

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Nama layanan wajib diisi",
		})

		return
	}

	// ========================================================
	// TRANSACTION
	// ========================================================

	tx := h.DB.Begin()

	if tx.Error != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memulai transaction",
			"error":   tx.Error.Error(),
		})

		return
	}

	// ========================================================
	// VALIDASI INSTANSI
	// ========================================================

	var instansi models.Instansi

	if err := tx.First(
		&instansi,
		input.InstansiID,
	).Error; err != nil {

		tx.Rollback()

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Instansi tidak ditemukan",
			})

			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa instansi",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// VALIDASI KATEGORI
	// ========================================================

	var kategori models.KategoriLayanan

	if err := tx.First(
		&kategori,
		input.KategoriID,
	).Error; err != nil {

		tx.Rollback()

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Kategori layanan tidak ditemukan",
			})

			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa kategori",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// CEK KODE DUPLIKAT
	// ========================================================

	var existing models.Layanan

	err := tx.
		Where(
			"kode_layanan = ?",
			input.KodeLayanan,
		).
		First(&existing).
		Error

	if err == nil {

		tx.Rollback()

		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Kode layanan sudah digunakan",
		})

		return
	}

	if !errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {

		tx.Rollback()

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa kode layanan",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// CREATE LAYANAN
	// ========================================================

	layanan := models.Layanan{
		KodeLayanan: input.KodeLayanan,
		NamaLayanan: input.NamaLayanan,
		Status:      input.Status,
		InstansiID:  input.InstansiID,
		KategoriID:  input.KategoriID,
	}

	if err := tx.Create(
		&layanan,
	).Error; err != nil {

		tx.Rollback()

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal membuat layanan",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// CREATE DETAIL
	// ========================================================

	if input.Detail != nil {

		detail := models.LayananDetail{
			LayananID:     layanan.ID,
			Deskripsi:     strings.TrimSpace(input.Detail.Deskripsi),
			KebutuhanUser: strings.TrimSpace(input.Detail.KebutuhanUser),
			Persyaratan:   strings.TrimSpace(input.Detail.Persyaratan),
			Prosedur:      strings.TrimSpace(input.Detail.Prosedur),
			Kanal:         strings.TrimSpace(input.Detail.Kanal),
		}

		if err := tx.Create(
			&detail,
		).Error; err != nil {

			tx.Rollback()

			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal membuat detail layanan",
				"error":   err.Error(),
			})

			return
		}
	}

	// ========================================================
	// CREATE SUMBER
	// ========================================================

	sourceSeen := make(
		map[string]bool,
	)

	for _, sourceInput := range input.Sumber {

		url := strings.TrimSpace(
			sourceInput.URL,
		)

		if url == "" {
			continue
		}

		urlKey := strings.ToLower(url)

		if sourceSeen[urlKey] {
			continue
		}

		sourceSeen[urlKey] = true

		tipe := strings.TrimSpace(
			sourceInput.TipeSumber,
		)

		if tipe == "" {
			tipe = "UNKNOWN"
		}

		source := models.LayananSumber{
			LayananID:  layanan.ID,
			URL:        url,
			TipeSumber: tipe,
			VerifiedAt: sourceInput.VerifiedAt,
		}

		if err := tx.Create(
			&source,
		).Error; err != nil {

			tx.Rollback()

			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal membuat sumber layanan",
				"error":   err.Error(),
			})

			return
		}
	}

	// ========================================================
	// CREATE KEYWORD
	// ========================================================

	keywordSeen := make(
		map[string]bool,
	)

	for _, keyword := range input.Keywords {

		keyword = strings.TrimSpace(
			keyword,
		)

		if keyword == "" {
			continue
		}

		key := strings.ToLower(
			keyword,
		)

		if keywordSeen[key] {
			continue
		}

		keywordSeen[key] = true

		item := models.LayananKeyword{
			LayananID: layanan.ID,
			Keyword:   keyword,
		}

		if err := tx.Create(
			&item,
		).Error; err != nil {

			tx.Rollback()

			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal membuat keyword",
				"error":   err.Error(),
			})

			return
		}
	}

	// ========================================================
	// CREATE STATUS KNOWLEDGE BASE
	// ========================================================

	if input.StatusKnowledge != nil {

		statusValue :=
			strings.ToUpper(
				strings.TrimSpace(
					input.StatusKnowledge.Status,
				),
			)

		if statusValue == "" {
			statusValue = "RAW"
		}

		status := models.LayananStatus{
			LayananID: layanan.ID,
			Status:    statusValue,
			Catatan: strings.TrimSpace(
				input.StatusKnowledge.Catatan,
			),
			CheckedAt: input.StatusKnowledge.CheckedAt,
		}

		if err := tx.Create(
			&status,
		).Error; err != nil {

			tx.Rollback()

			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal membuat status knowledge base",
				"error":   err.Error(),
			})

			return
		}
	}

	// ========================================================
	// COMMIT
	// ========================================================

	if err := tx.Commit().Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menyimpan transaction",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// AMBIL DATA LENGKAP
	// ========================================================

	var result models.Layanan

	err = preloadLayanan(
		h.DB,
	).
		First(
			&result,
			layanan.ID,
		).
		Error

	if err != nil {

		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"message": "Layanan berhasil dibuat",
			"data":    layanan,
		})

		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Layanan berhasil dibuat",
		"data":    result,
	})
}

// ============================================================
// PUT /api/layanan/:id
// ============================================================

func (h *LayananHandler) UpdateLayanan(c *gin.Context) {

	// ========================================================
	// AMBIL ID
	// ========================================================

	id, err := strconv.ParseUint(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID tidak valid",
		})

		return
	}

	// ========================================================
	// REQUEST
	// ========================================================

	var input CreateLayananRequest

	if err := c.ShouldBindJSON(&input); err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format request tidak valid",
			"error":   err.Error(),
		})

		return
	}

	input.KodeLayanan =
		strings.TrimSpace(
			input.KodeLayanan,
		)

	input.NamaLayanan =
		strings.TrimSpace(
			input.NamaLayanan,
		)

	input.Status =
		strings.TrimSpace(
			input.Status,
		)

	// ========================================================
	// TRANSACTION
	// ========================================================

	tx := h.DB.Begin()

	if tx.Error != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memulai transaction",
			"error":   tx.Error.Error(),
		})

		return
	}

	// ========================================================
	// CARI LAYANAN
	// ========================================================

	var layanan models.Layanan

	if err := tx.First(
		&layanan,
		id,
	).Error; err != nil {

		tx.Rollback()

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Layanan tidak ditemukan",
			})

			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mencari layanan",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// VALIDASI INSTANSI
	// ========================================================

	var instansi models.Instansi

	if err := tx.First(
		&instansi,
		input.InstansiID,
	).Error; err != nil {

		tx.Rollback()

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Instansi tidak ditemukan",
			})

			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa instansi",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// VALIDASI KATEGORI
	// ========================================================

	var kategori models.KategoriLayanan

	if err := tx.First(
		&kategori,
		input.KategoriID,
	).Error; err != nil {

		tx.Rollback()

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Kategori layanan tidak ditemukan",
			})

			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa kategori",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// CEK KODE DUPLIKAT
	// ========================================================

	var existing models.Layanan

	err = tx.
		Where(
			"kode_layanan = ? AND id <> ?",
			input.KodeLayanan,
			id,
		).
		First(&existing).
		Error

	if err == nil {

		tx.Rollback()

		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Kode layanan sudah digunakan oleh layanan lain",
		})

		return
	}

	if !errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {

		tx.Rollback()

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memeriksa kode layanan",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// UPDATE LAYANAN UTAMA
	// ========================================================

	layanan.KodeLayanan =
		input.KodeLayanan

	layanan.NamaLayanan =
		input.NamaLayanan

	layanan.Status =
		input.Status

	layanan.InstansiID =
		input.InstansiID

	layanan.KategoriID =
		input.KategoriID

	if err := tx.Save(
		&layanan,
	).Error; err != nil {

		tx.Rollback()

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengupdate layanan",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// UPDATE DETAIL
	// ========================================================

	if input.Detail != nil {

		var detail models.LayananDetail

		err := tx.
			Where(
				"layanan_id = ?",
				layanan.ID,
			).
			First(&detail).
			Error

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			detail = models.LayananDetail{
				LayananID: layanan.ID,

				Deskripsi: strings.TrimSpace(
					input.Detail.Deskripsi,
				),

				KebutuhanUser: strings.TrimSpace(
					input.Detail.KebutuhanUser,
				),

				Persyaratan: strings.TrimSpace(
					input.Detail.Persyaratan,
				),

				Prosedur: strings.TrimSpace(
					input.Detail.Prosedur,
				),

				Kanal: strings.TrimSpace(
					input.Detail.Kanal,
				),
			}

			if err := tx.Create(
				&detail,
			).Error; err != nil {

				tx.Rollback()

				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "Gagal membuat detail layanan",
					"error":   err.Error(),
				})

				return
			}

		} else if err != nil {

			tx.Rollback()

			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal mengambil detail layanan",
				"error":   err.Error(),
			})

			return

		} else {

			detail.Deskripsi =
				strings.TrimSpace(
					input.Detail.Deskripsi,
				)

			detail.KebutuhanUser =
				strings.TrimSpace(
					input.Detail.KebutuhanUser,
				)

			detail.Persyaratan =
				strings.TrimSpace(
					input.Detail.Persyaratan,
				)

			detail.Prosedur =
				strings.TrimSpace(
					input.Detail.Prosedur,
				)

			detail.Kanal =
				strings.TrimSpace(
					input.Detail.Kanal,
				)

			if err := tx.Save(
				&detail,
			).Error; err != nil {

				tx.Rollback()

				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "Gagal mengupdate detail layanan",
					"error":   err.Error(),
				})

				return
			}
		}
	}

	// ========================================================
	// HAPUS SUMBER LAMA
	// ========================================================

	if err := tx.
		Where(
			"layanan_id = ?",
			layanan.ID,
		).
		Delete(
			&models.LayananSumber{},
		).
		Error; err != nil {

		tx.Rollback()

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghapus sumber lama",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// INSERT SUMBER BARU
	// ========================================================

	sourceSeen := make(
		map[string]bool,
	)

	for _, sourceInput := range input.Sumber {

		url := strings.TrimSpace(
			sourceInput.URL,
		)

		if url == "" {
			continue
		}

		key := strings.ToLower(url)

		if sourceSeen[key] {
			continue
		}

		sourceSeen[key] = true

		tipe := strings.TrimSpace(
			sourceInput.TipeSumber,
		)

		if tipe == "" {
			tipe = "UNKNOWN"
		}

		source := models.LayananSumber{
			LayananID:  layanan.ID,
			URL:        url,
			TipeSumber: tipe,
			VerifiedAt: sourceInput.VerifiedAt,
		}

		if err := tx.Create(
			&source,
		).Error; err != nil {

			tx.Rollback()

			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal membuat sumber layanan",
				"error":   err.Error(),
			})

			return
		}
	}

	// ========================================================
	// HAPUS KEYWORD LAMA
	// ========================================================

	if err := tx.
		Where(
			"layanan_id = ?",
			layanan.ID,
		).
		Delete(
			&models.LayananKeyword{},
		).
		Error; err != nil {

		tx.Rollback()

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghapus keyword lama",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// INSERT KEYWORD BARU
	// ========================================================

	keywordSeen := make(
		map[string]bool,
	)

	for _, keyword := range input.Keywords {

		keyword = strings.TrimSpace(
			keyword,
		)

		if keyword == "" {
			continue
		}

		key := strings.ToLower(
			keyword,
		)

		if keywordSeen[key] {
			continue
		}

		keywordSeen[key] = true

		item := models.LayananKeyword{
			LayananID: layanan.ID,
			Keyword:   keyword,
		}

		if err := tx.Create(
			&item,
		).Error; err != nil {

			tx.Rollback()

			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal membuat keyword",
				"error":   err.Error(),
			})

			return
		}
	}

	// ========================================================
	// UPDATE STATUS KNOWLEDGE BASE
	// ========================================================

	if input.StatusKnowledge != nil {

		statusValue :=
			strings.ToUpper(
				strings.TrimSpace(
					input.StatusKnowledge.Status,
				),
			)

		if statusValue == "" {
			statusValue = "RAW"
		}

		var status models.LayananStatus

		err := tx.
			Where(
				"layanan_id = ?",
				layanan.ID,
			).
			Order(
				"id DESC",
			).
			First(&status).
			Error

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			status = models.LayananStatus{
				LayananID: layanan.ID,
				Status:    statusValue,
				Catatan: strings.TrimSpace(
					input.StatusKnowledge.Catatan,
				),
				CheckedAt: input.StatusKnowledge.CheckedAt,
			}

			if err := tx.Create(
				&status,
			).Error; err != nil {

				tx.Rollback()

				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "Gagal membuat status knowledge base",
					"error":   err.Error(),
				})

				return
			}

		} else if err != nil {

			tx.Rollback()

			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal mengambil status knowledge base",
				"error":   err.Error(),
			})

			return

		} else {

			status.Status =
				statusValue

			status.Catatan =
				strings.TrimSpace(
					input.StatusKnowledge.Catatan,
				)

			status.CheckedAt =
				input.StatusKnowledge.CheckedAt

			if err := tx.Save(
				&status,
			).Error; err != nil {

				tx.Rollback()

				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "Gagal mengupdate status knowledge base",
					"error":   err.Error(),
				})

				return
			}
		}
	}

	// ========================================================
	// COMMIT
	// ========================================================

	if err := tx.Commit().Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menyimpan perubahan",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// AMBIL DATA TERBARU
	// ========================================================

	var result models.Layanan

	err = preloadLayanan(
		h.DB,
	).
		First(
			&result,
			layanan.ID,
		).
		Error

	if err != nil {

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Layanan berhasil diupdate",
			"data":    layanan,
		})

		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Layanan berhasil diupdate",
		"data":    result,
	})
}

// ============================================================
// DELETE /api/layanan/:id
// ============================================================

func (h *LayananHandler) DeleteLayanan(c *gin.Context) {

	// ========================================================
	// AMBIL ID
	// ========================================================

	id, err := strconv.ParseUint(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID tidak valid",
		})

		return
	}

	// ========================================================
	// CARI LAYANAN
	// ========================================================

	var layanan models.Layanan

	if err := h.DB.First(
		&layanan,
		id,
	).Error; err != nil {

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Layanan tidak ditemukan",
			})

			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mencari layanan",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// TRANSACTION
	// ========================================================

	tx := h.DB.Begin()

	if tx.Error != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memulai transaction",
			"error":   tx.Error.Error(),
		})

		return
	}

	// ========================================================
	// DELETE LAYANAN
	// ========================================================
	//
	// Tabel:
	// layanan_detail
	// layanan_sumber
	// layanan_keyword
	// layanan_status
	// layanan_embedding
	// monitoring_layanan
	//
	// akan ikut terhapus jika foreign key database
	// sudah menggunakan ON DELETE CASCADE.
	//

	if err := tx.Delete(
		&layanan,
	).Error; err != nil {

		tx.Rollback()

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghapus layanan",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// COMMIT
	// ========================================================

	if err := tx.Commit().Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menyimpan penghapusan",
			"error":   err.Error(),
		})

		return
	}

	// ========================================================
	// RESPONSE
	// ========================================================

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Layanan berhasil dihapus",
		"data": gin.H{
			"id":           layanan.ID,
			"kode_layanan": layanan.KodeLayanan,
			"nama_layanan": layanan.NamaLayanan,
		},
	})
}
