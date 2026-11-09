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

type InstansiHandler struct {
	DB *gorm.DB
}

func NewInstansiHandler(db *gorm.DB) *InstansiHandler {
	return &InstansiHandler{
		DB: db,
	}
}

// ============================================================
// REQUEST
// ============================================================

type InstansiRequest struct {
	WilayahID uint64 `json:"wilayah_id" binding:"required"`

	KodeInstansi string `json:"kode_instansi" binding:"required"`
	NamaInstansi string `json:"nama_instansi" binding:"required"`

	Singkatan string `json:"singkatan"`
	Website   string `json:"website"`

	Aktif *bool `json:"aktif"`
}

// ============================================================
// RESPONSE
// ============================================================

type InstansiResponse struct {
	ID uint64 `json:"id"`

	WilayahID uint64 `json:"wilayah_id"`
	LevelID   uint64 `json:"level_id"`

	KodeInstansi string `json:"kode_instansi"`
	NamaInstansi string `json:"nama_instansi"`
	Singkatan    string `json:"singkatan"`
	Website      string `json:"website"`
	Aktif        bool   `json:"aktif"`

	Wilayah *WilayahResponse `json:"wilayah,omitempty"`
	Level   *LevelResponse   `json:"level,omitempty"`

	JumlahLayanan int64 `json:"jumlah_layanan"`
}

// ============================================================
// WILAYAH
// ============================================================

type WilayahResponse struct {
	ID   uint64 `json:"id"`
	Nama string `json:"nama"`
	Tipe string `json:"tipe"`
}

// ============================================================
// LEVEL
// ============================================================

type LevelResponse struct {
	ID   uint64 `json:"id"`
	Nama string `json:"nama"`
}

// ============================================================
// SUMMARY
// ============================================================

type InstansiSummary struct {
	Total           int64 `json:"total"`
	Aktif           int64 `json:"aktif"`
	Nonaktif        int64 `json:"nonaktif"`
	PerluVerifikasi int64 `json:"perlu_verifikasi"`
}

// ============================================================
// MAPPING WILAYAH -> LEVEL
// ============================================================

func getLevelNameFromWilayah(
	tipe string,
) (string, error) {

	value :=
		strings.ToLower(
			strings.TrimSpace(
				tipe,
			),
		)

	switch value {

	case "nasional":
		return "Pusat", nil

	case "pusat":
		return "Pusat", nil

	case "provinsi":
		return "Provinsi", nil

	case "kabupaten":
		return "Kabupaten", nil

	case "kota":
		return "Kota", nil

	default:
		return "", errors.New(
			"tipe wilayah tidak dikenali: " + tipe,
		)
	}
}

// ============================================================
// BUILD RESPONSE
// ============================================================

func buildInstansiResponse(
	item instansiRow,
) InstansiResponse {

	return InstansiResponse{
		ID: item.ID,

		WilayahID: item.WilayahID,

		LevelID: item.LevelID,

		KodeInstansi: item.KodeInstansi,

		NamaInstansi: item.NamaInstansi,

		Singkatan: item.Singkatan,

		Website: item.Website,

		Aktif: item.Aktif,

		JumlahLayanan: item.JumlahLayanan,

		Wilayah: &WilayahResponse{
			ID:   item.WilayahID,
			Nama: item.WilayahNama,
			Tipe: item.WilayahTipe,
		},

		Level: &LevelResponse{
			ID:   item.LevelID,
			Nama: item.LevelNama,
		},
	}
}

// ============================================================
// DATABASE ROW
// ============================================================

type instansiRow struct {
	ID uint64

	WilayahID   uint64
	WilayahNama string
	WilayahTipe string

	LevelID   uint64
	LevelNama string

	KodeInstansi string
	NamaInstansi string
	Singkatan    string
	Website      string
	Aktif        bool

	JumlahLayanan int64
}

// ============================================================
// GET /api/instansi
// ============================================================

func (h *InstansiHandler) GetInstansi(
	c *gin.Context,
) {

	search :=
		strings.TrimSpace(
			c.Query("search"),
		)

	wilayahIDParam :=
		strings.TrimSpace(
			c.Query("wilayah_id"),
		)

	aktifParam :=
		strings.TrimSpace(
			c.Query("aktif"),
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
	// WILAYAH ID
	// ========================================================

	var wilayahID uint64

	if wilayahIDParam != "" {

		wilayahID, err =
			strconv.ParseUint(
				wilayahIDParam,
				10,
				64,
			)

		if err != nil {

			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"success": false,
					"message": "wilayah_id tidak valid",
				},
			)

			return
		}
	}

	// ========================================================
	// AKTIF
	// ========================================================

	var aktif *bool

	if aktifParam != "" {

		value, err :=
			strconv.ParseBool(
				aktifParam,
			)

		if err != nil {

			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"success": false,
					"message": "aktif harus true atau false",
				},
			)

			return
		}

		aktif = &value
	}

	// ========================================================
	// COUNT TOTAL
	// ========================================================

	countQuery :=
		h.DB.
			Table("instansi i").
			Joins(
				"LEFT JOIN wilayah w ON w.id = i.wilayah_id",
			)

	// =====================================================
	// SEARCH
	// =====================================================

	if search != "" {

		pattern :=
			"%" + search + "%"

		countQuery =
			countQuery.Where(`
				i.nama_instansi ILIKE ?
				OR i.kode_instansi ILIKE ?
				OR i.singkatan ILIKE ?
				OR w.nama ILIKE ?
			`,
				pattern,
				pattern,
				pattern,
				pattern,
			)
	}

	// =====================================================
	// WILAYAH
	// =====================================================

	if wilayahIDParam != "" {

		countQuery =
			countQuery.Where(
				"i.wilayah_id = ?",
				wilayahID,
			)
	}

	// =====================================================
	// STATUS
	// =====================================================

	if aktif != nil {

		countQuery =
			countQuery.Where(
				"i.aktif = ?",
				*aktif,
			)
	}

	// =====================================================
	// EXECUTE COUNT
	// =====================================================

	var total int64

	if err := countQuery.
		Count(
			&total,
		).
		Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal menghitung total instansi",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// DATA QUERY
	// ========================================================

	dataQuery :=
		h.DB.
			Table("instansi i").
			Select(`
				i.id,

				i.wilayah_id,

				w.nama AS wilayah_nama,

				w.tipe AS wilayah_tipe,

				i.level_id,

				lp.nama AS level_nama,

				i.kode_instansi,

				i.nama_instansi,

				i.singkatan,

				i.website,

				i.aktif,

				COUNT(l.id) AS jumlah_layanan
			`).
			Joins(
				"LEFT JOIN wilayah w ON w.id = i.wilayah_id",
			).
			Joins(
				"LEFT JOIN level_pemerintahan lp ON lp.id = i.level_id",
			).
			Joins(
				"LEFT JOIN layanan l ON l.instansi_id = i.id",
			)

	// ========================================================
	// SEARCH
	// ========================================================

	if search != "" {

		pattern :=
			"%" + search + "%"

		dataQuery =
			dataQuery.Where(`
				i.nama_instansi ILIKE ?
				OR i.kode_instansi ILIKE ?
				OR i.singkatan ILIKE ?
				OR w.nama ILIKE ?
			`,
				pattern,
				pattern,
				pattern,
				pattern,
			)
	}

	// ========================================================
	// WILAYAH
	// ========================================================

	if wilayahIDParam != "" {

		dataQuery =
			dataQuery.Where(
				"i.wilayah_id = ?",
				wilayahID,
			)
	}

	// ========================================================
	// STATUS
	// ========================================================

	if aktif != nil {

		dataQuery =
			dataQuery.Where(
				"i.aktif = ?",
				*aktif,
			)
	}

	// ========================================================
	// GROUP
	// ========================================================

	dataQuery =
		dataQuery.
			Group(`
				i.id,
				i.wilayah_id,
				w.nama,
				w.tipe,
				i.level_id,
				lp.nama,
				i.kode_instansi,
				i.nama_instansi,
				i.singkatan,
				i.website,
				i.aktif
			`).
			Order(
				"i.id ASC",
			).
			Limit(
				limit,
			).
			Offset(
				offset,
			)

	// ========================================================
	// EXECUTE
	// ========================================================

	var rows []instansiRow

	if err := dataQuery.
		Scan(
			&rows,
		).
		Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mengambil data instansi",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// MAPPING
	// ========================================================

	data :=
		make(
			[]InstansiResponse,
			0,
			len(rows),
		)

	for _, row := range rows {

		data =
			append(
				data,
				buildInstansiResponse(
					row,
				),
			)
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
				"page": page,

				"limit": limit,

				"total": total,

				"total_pages": totalPages,
			},

			"data": data,
		},
	)
}

// ============================================================
// GET /api/instansi/summary
// ============================================================

func (h *InstansiHandler) GetInstansiSummary(
	c *gin.Context,
) {

	var summary InstansiSummary

	err := h.DB.
		Table("instansi").
		Select(`
			COUNT(*) AS total,

			COUNT(*) FILTER (
				WHERE aktif = true
			) AS aktif,

			COUNT(*) FILTER (
				WHERE aktif = false
			) AS nonaktif,

			COUNT(*) FILTER (
				WHERE website IS NULL
				OR TRIM(website) = ''
			) AS perlu_verifikasi
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
				"message": "Gagal mengambil statistik instansi",
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
// GET /api/instansi/:id
// ============================================================

func (h *InstansiHandler) GetInstansiByID(
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
				"message": "ID instansi tidak valid",
			},
		)

		return
	}

	var row instansiRow

	err =
		h.DB.
			Table("instansi i").
			Select(`
				i.id,
				i.wilayah_id,
				w.nama AS wilayah_nama,
				w.tipe AS wilayah_tipe,
				i.level_id,
				lp.nama AS level_nama,
				i.kode_instansi,
				i.nama_instansi,
				i.singkatan,
				i.website,
				i.aktif,
				COUNT(l.id) AS jumlah_layanan
			`).
			Joins(
				"LEFT JOIN wilayah w ON w.id = i.wilayah_id",
			).
			Joins(
				"LEFT JOIN level_pemerintahan lp ON lp.id = i.level_id",
			).
			Joins(
				"LEFT JOIN layanan l ON l.instansi_id = i.id",
			).
			Where(
				"i.id = ?",
				id,
			).
			Group(`
				i.id,
				i.wilayah_id,
				w.nama,
				w.tipe,
				i.level_id,
				lp.nama,
				i.kode_instansi,
				i.nama_instansi,
				i.singkatan,
				i.website,
				i.aktif
			`).
			Scan(
				&row,
			).
			Error

	if err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mengambil instansi",
				"error":   err.Error(),
			},
		)

		return
	}

	if row.ID == 0 {

		c.JSON(
			http.StatusNotFound,
			gin.H{
				"success": false,
				"message": "Instansi tidak ditemukan",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"success": true,
			"data": buildInstansiResponse(
				row,
			),
		},
	)
}

// ============================================================
// POST /api/instansi
// ============================================================

func (h *InstansiHandler) CreateInstansi(
	c *gin.Context,
) {

	var input InstansiRequest

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

	// ========================================================
	// NORMALISASI
	// ========================================================

	input.KodeInstansi =
		strings.TrimSpace(
			input.KodeInstansi,
		)

	input.NamaInstansi =
		strings.TrimSpace(
			input.NamaInstansi,
		)

	input.Singkatan =
		strings.TrimSpace(
			input.Singkatan,
		)

	input.Website =
		strings.TrimSpace(
			input.Website,
		)

	// ========================================================
	// TRANSACTION
	// ========================================================

	tx := h.DB.Begin()

	if tx.Error != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal memulai transaction",
				"error":   tx.Error.Error(),
			},
		)

		return
	}

	// ========================================================
	// VALIDASI WILAYAH
	// ========================================================

	var wilayah models.Wilayah

	if err := tx.
		First(
			&wilayah,
			input.WilayahID,
		).
		Error; err != nil {

		tx.Rollback()

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"success": false,
					"message": "Wilayah tidak ditemukan",
				},
			)

			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal memeriksa wilayah",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// LEVEL DARI WILAYAH
	// ========================================================

	levelName, err :=
		getLevelNameFromWilayah(
			wilayah.Tipe,
		)

	if err != nil {

		tx.Rollback()

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"success": false,
				"message": err.Error(),
				"wilayah": wilayah.Nama,
				"tipe":    wilayah.Tipe,
			},
		)

		return
	}

	var level models.LevelPemerintahan

	if err := tx.
		Where(
			"LOWER(nama) = LOWER(?)",
			levelName,
		).
		First(
			&level,
		).
		Error; err != nil {

		tx.Rollback()

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"success": false,
					"message": "Level pemerintahan tidak ditemukan",
					"level":   levelName,
				},
			)

			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mencari level pemerintahan",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// VALIDASI KODE
	// ========================================================

	var existing models.Instansi

	err =
		tx.
			Where(
				"LOWER(kode_instansi) = LOWER(?)",
				input.KodeInstansi,
			).
			First(
				&existing,
			).
			Error

	if err == nil {

		tx.Rollback()

		c.JSON(
			http.StatusConflict,
			gin.H{
				"success": false,
				"message": "Kode instansi sudah digunakan",
			},
		)

		return
	}

	if !errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {

		tx.Rollback()

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal memeriksa kode instansi",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// STATUS
	// ========================================================

	aktif := true

	if input.Aktif != nil {
		aktif =
			*input.Aktif
	}

	// ========================================================
	// CREATE
	// ========================================================

	instansi :=
		models.Instansi{
			WilayahID: input.WilayahID,

			LevelID: level.ID,

			KodeInstansi: input.KodeInstansi,

			NamaInstansi: input.NamaInstansi,

			Singkatan: input.Singkatan,

			Website: input.Website,

			Aktif: aktif,
		}

	if err := tx.
		Create(
			&instansi,
		).
		Error; err != nil {

		tx.Rollback()

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal membuat instansi",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// COMMIT
	// ========================================================

	if err := tx.Commit().Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal menyimpan instansi",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// RESPONSE DATA TERBARU
	// ========================================================

	var row instansiRow

	err =
		h.DB.
			Table("instansi i").
			Select(`
				i.id,
				i.wilayah_id,
				w.nama AS wilayah_nama,
				w.tipe AS wilayah_tipe,
				i.level_id,
				lp.nama AS level_nama,
				i.kode_instansi,
				i.nama_instansi,
				i.singkatan,
				i.website,
				i.aktif,
				COUNT(l.id) AS jumlah_layanan
			`).
			Joins(
				"LEFT JOIN wilayah w ON w.id = i.wilayah_id",
			).
			Joins(
				"LEFT JOIN level_pemerintahan lp ON lp.id = i.level_id",
			).
			Joins(
				"LEFT JOIN layanan l ON l.instansi_id = i.id",
			).
			Where(
				"i.id = ?",
				instansi.ID,
			).
			Group(`
				i.id,
				i.wilayah_id,
				w.nama,
				w.tipe,
				i.level_id,
				lp.nama,
				i.kode_instansi,
				i.nama_instansi,
				i.singkatan,
				i.website,
				i.aktif
			`).
			Scan(
				&row,
			).
			Error

	if err != nil {

		c.JSON(
			http.StatusCreated,
			gin.H{
				"success": true,
				"message": "Instansi berhasil dibuat",
				"data":    instansi,
			},
		)

		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"success": true,
			"message": "Instansi berhasil dibuat",
			"data": buildInstansiResponse(
				row,
			),
		},
	)
}

// ============================================================
// PUT /api/instansi/:id
// ============================================================

func (h *InstansiHandler) UpdateInstansi(
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
				"message": "ID instansi tidak valid",
			},
		)

		return
	}

	var input InstansiRequest

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

	input.KodeInstansi =
		strings.TrimSpace(
			input.KodeInstansi,
		)

	input.NamaInstansi =
		strings.TrimSpace(
			input.NamaInstansi,
		)

	input.Singkatan =
		strings.TrimSpace(
			input.Singkatan,
		)

	input.Website =
		strings.TrimSpace(
			input.Website,
		)

	// ========================================================
	// TRANSACTION
	// ========================================================

	tx := h.DB.Begin()

	if tx.Error != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal memulai transaction",
				"error":   tx.Error.Error(),
			},
		)

		return
	}

	// ========================================================
	// CARI INSTANSI
	// ========================================================

	var instansi models.Instansi

	if err := tx.
		First(
			&instansi,
			id,
		).
		Error; err != nil {

		tx.Rollback()

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(
				http.StatusNotFound,
				gin.H{
					"success": false,
					"message": "Instansi tidak ditemukan",
				},
			)

			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mencari instansi",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// WILAYAH
	// ========================================================

	var wilayah models.Wilayah

	if err := tx.
		First(
			&wilayah,
			input.WilayahID,
		).
		Error; err != nil {

		tx.Rollback()

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"success": false,
					"message": "Wilayah tidak ditemukan",
				},
			)

			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal memeriksa wilayah",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// LEVEL DARI WILAYAH
	// ========================================================

	levelName, err :=
		getLevelNameFromWilayah(
			wilayah.Tipe,
		)

	if err != nil {

		tx.Rollback()

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"success": false,
				"message": err.Error(),
				"wilayah": wilayah.Nama,
				"tipe":    wilayah.Tipe,
			},
		)

		return
	}

	var level models.LevelPemerintahan

	if err := tx.
		Where(
			"LOWER(nama) = LOWER(?)",
			levelName,
		).
		First(
			&level,
		).
		Error; err != nil {

		tx.Rollback()

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"success": false,
					"message": "Level pemerintahan tidak ditemukan",
					"level":   levelName,
				},
			)

			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mencari level pemerintahan",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// CEK KODE DUPLIKAT
	// ========================================================

	var duplicate models.Instansi

	err =
		tx.
			Where(`
				LOWER(kode_instansi) = LOWER(?)
				AND id <> ?
			`,
				input.KodeInstansi,
				id,
			).
			First(
				&duplicate,
			).
			Error

	if err == nil {

		tx.Rollback()

		c.JSON(
			http.StatusConflict,
			gin.H{
				"success": false,
				"message": "Kode instansi sudah digunakan oleh instansi lain",
			},
		)

		return
	}

	if !errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {

		tx.Rollback()

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal memeriksa kode instansi",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// UPDATE
	// ========================================================

	instansi.WilayahID =
		input.WilayahID

	instansi.LevelID =
		level.ID

	instansi.KodeInstansi =
		input.KodeInstansi

	instansi.NamaInstansi =
		input.NamaInstansi

	instansi.Singkatan =
		input.Singkatan

	instansi.Website =
		input.Website

	if input.Aktif != nil {
		instansi.Aktif =
			*input.Aktif
	}

	if err := tx.
		Save(
			&instansi,
		).
		Error; err != nil {

		tx.Rollback()

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mengupdate instansi",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// COMMIT
	// ========================================================

	if err := tx.Commit().Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal menyimpan perubahan",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// RESPONSE TERBARU
	// ========================================================

	var row instansiRow

	err =
		h.DB.
			Table("instansi i").
			Select(`
				i.id,
				i.wilayah_id,
				w.nama AS wilayah_nama,
				w.tipe AS wilayah_tipe,
				i.level_id,
				lp.nama AS level_nama,
				i.kode_instansi,
				i.nama_instansi,
				i.singkatan,
				i.website,
				i.aktif,
				COUNT(l.id) AS jumlah_layanan
			`).
			Joins(
				"LEFT JOIN wilayah w ON w.id = i.wilayah_id",
			).
			Joins(
				"LEFT JOIN level_pemerintahan lp ON lp.id = i.level_id",
			).
			Joins(
				"LEFT JOIN layanan l ON l.instansi_id = i.id",
			).
			Where(
				"i.id = ?",
				id,
			).
			Group(`
				i.id,
				i.wilayah_id,
				w.nama,
				w.tipe,
				i.level_id,
				lp.nama,
				i.kode_instansi,
				i.nama_instansi,
				i.singkatan,
				i.website,
				i.aktif
			`).
			Scan(
				&row,
			).
			Error

	if err != nil {

		c.JSON(
			http.StatusOK,
			gin.H{
				"success": true,
				"message": "Instansi berhasil diupdate",
				"data":    instansi,
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"success": true,
			"message": "Instansi berhasil diupdate",
			"data": buildInstansiResponse(
				row,
			),
		},
	)
}

// ============================================================
// DELETE /api/instansi/:id
// ============================================================

func (h *InstansiHandler) DeleteInstansi(
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
				"message": "ID instansi tidak valid",
			},
		)

		return
	}

	var instansi models.Instansi

	if err := h.DB.
		First(
			&instansi,
			id,
		).
		Error; err != nil {

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(
				http.StatusNotFound,
				gin.H{
					"success": false,
					"message": "Instansi tidak ditemukan",
				},
			)

			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mencari instansi",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// CEK LAYANAN
	// ========================================================

	var jumlahLayanan int64

	if err := h.DB.
		Model(
			&models.Layanan{},
		).
		Where(
			"instansi_id = ?",
			id,
		).
		Count(
			&jumlahLayanan,
		).
		Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal memeriksa penggunaan instansi",
				"error":   err.Error(),
			},
		)

		return
	}

	// ========================================================
	// MASIH DIPAKAI
	// ========================================================

	if jumlahLayanan > 0 {

		c.JSON(
			http.StatusConflict,
			gin.H{
				"success":        false,
				"message":        "Instansi tidak dapat dihapus karena masih digunakan oleh layanan",
				"jumlah_layanan": jumlahLayanan,
			},
		)

		return
	}

	// ========================================================
	// DELETE
	// ========================================================

	if err := h.DB.
		Delete(
			&instansi,
		).
		Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal menghapus instansi",
				"error":   err.Error(),
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"success": true,
			"message": "Instansi berhasil dihapus",
			"data": gin.H{
				"id": instansi.ID,

				"kode_instansi": instansi.KodeInstansi,

				"nama_instansi": instansi.NamaInstansi,
			},
		},
	)
}
