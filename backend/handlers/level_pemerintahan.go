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

type LevelPemerintahanHandler struct {
	DB *gorm.DB
}

func NewLevelPemerintahanHandler(
	db *gorm.DB,
) *LevelPemerintahanHandler {

	return &LevelPemerintahanHandler{
		DB: db,
	}
}

// ============================================================
// GET /api/level-pemerintahan
// ============================================================

func (h *LevelPemerintahanHandler) GetLevelPemerintahan(
	c *gin.Context,
) {

	var levels []models.LevelPemerintahan

	query := h.DB.
		Model(&models.LevelPemerintahan{}).
		Order("id ASC")

	// ========================================================
	// SEARCH
	// ========================================================

	search := strings.TrimSpace(
		c.Query("search"),
	)

	if search != "" {

		query = query.Where(
			"nama ILIKE ?",
			"%"+search+"%",
		)
	}

	// ========================================================
	// DATA
	// ========================================================

	if err := query.
		Find(&levels).
		Error; err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mengambil data level pemerintahan",
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
			"data":    levels,
		},
	)
}

// ============================================================
// GET /api/level-pemerintahan/:id
// ============================================================

func (h *LevelPemerintahanHandler) GetLevelPemerintahanByID(
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
				"message": "ID level pemerintahan tidak valid",
			},
		)

		return
	}

	var level models.LevelPemerintahan

	err = h.DB.
		First(
			&level,
			id,
		).
		Error

	if err != nil {

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {

			c.JSON(
				http.StatusNotFound,
				gin.H{
					"success": false,
					"message": "Level pemerintahan tidak ditemukan",
				},
			)

			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"success": false,
				"message": "Gagal mengambil level pemerintahan",
				"error":   err.Error(),
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"success": true,
			"data":    level,
		},
	)
}
