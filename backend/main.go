package main

import (
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"endpoint_api/handlers"
	"endpoint_api/models"
)

func main() {

	// ==========================================================
	// DATABASE
	// ==========================================================

	ConnectDatabase()

	// ==========================================================
	// MIGRATION
	// ==========================================================

	if err := DB.AutoMigrate(
		&User{},
		&models.Pengaduan{},
	); err != nil {
		panic("Gagal melakukan migration: " + err.Error())
	}

	println("Database migration berhasil!")

	// ==========================================================
	// IMPORT EXCEL
	// ==========================================================

	// ImportAllExcel()

	// ==========================================================
	// SEED SUPER ADMIN & PENGADUAN
	// ==========================================================

	SeedAdmin()
	SeedPengaduan()

	// ==========================================================
	// HANDLER
	// ==========================================================

	layananHandler := handlers.NewLayananHandler(DB)
	wilayahHandler := handlers.NewWilayahHandler(DB)
	instansiHandler := handlers.NewInstansiHandler(DB)
	kategoriLayananHandler := handlers.NewKategoriLayananHandler(DB)
	layananStatusHandler := handlers.NewLayananStatusHandler(DB)
	layananKeywordHandler := handlers.NewLayananKeywordHandler(DB)
	userHandler := handlers.NewUserHandler(DB)
	pengaduanHandler := handlers.NewPengaduanHandler(DB)

	// ==========================================================
	// GIN ROUTER
	// ==========================================================

	router := gin.Default()

	// ==========================================================
	// CORS
	// ==========================================================

	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173",
		},
		AllowMethods: []string{
			"GET",
			"POST",
			"PUT",
			"DELETE",
			"OPTIONS",
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Accept",
			"Authorization",
		},
		AllowCredentials: true,
	}))

	// ==========================================================
	// API GROUP
	// ==========================================================

	api := router.Group("/api")

	// ==========================================================
	// AUTH
	// ==========================================================

	api.POST("/login", Login)

	// ==========================================================
	// PUBLIC READ - LAYANAN
	// ==========================================================

	api.GET(
		"/layanan",
		OptionalAuthMiddleware(),
		layananHandler.GetLayanans,
	)

	api.GET(
		"/layanan/:id",
		OptionalAuthMiddleware(),
		layananHandler.GetLayananByID,
	)

	// ==========================================================
	// PUBLIC READ - WILAYAH
	// ==========================================================

	api.GET(
		"/wilayah",
		OptionalAuthMiddleware(),
		wilayahHandler.GetWilayah,
	)

	api.GET(
		"/wilayah/:id",
		OptionalAuthMiddleware(),
		wilayahHandler.GetWilayahByID,
	)

	// ==========================================================
	// PUBLIC READ - INSTANSI
	// ==========================================================

	api.GET(
		"/instansi",
		OptionalAuthMiddleware(),
		instansiHandler.GetInstansi,
	)

	api.GET(
		"/instansi/summary",
		OptionalAuthMiddleware(),
		instansiHandler.GetInstansiSummary,
	)

	api.GET(
		"/instansi/:id",
		OptionalAuthMiddleware(),
		instansiHandler.GetInstansiByID,
	)

	// ==========================================================
	// PUBLIC READ - KATEGORI LAYANAN
	// ==========================================================

	api.GET(
		"/kategori-layanan",
		OptionalAuthMiddleware(),
		kategoriLayananHandler.GetKategoriLayanan,
	)

	api.GET(
		"/kategori-layanan/:id",
		OptionalAuthMiddleware(),
		kategoriLayananHandler.GetKategoriLayananByID,
	)

	// ==========================================================
	// PUBLIC READ - STATUS LAYANAN
	// ==========================================================

	api.GET(
		"/layanan-status",
		OptionalAuthMiddleware(),
		layananStatusHandler.GetLayananStatus,
	)

	api.GET(
		"/layanan-status/summary",
		OptionalAuthMiddleware(),
		layananStatusHandler.GetLayananStatusSummary,
	)

	api.GET(
		"/layanan-status/:id",
		OptionalAuthMiddleware(),
		layananStatusHandler.GetLayananStatusByID,
	)

	// ==========================================================
	// PUBLIC READ - KEYWORD
	// ==========================================================

	api.GET(
		"/layanan-keyword",
		OptionalAuthMiddleware(),
		layananKeywordHandler.GetLayananKeyword,
	)

	api.GET(
		"/layanan-keyword/summary",
		OptionalAuthMiddleware(),
		layananKeywordHandler.GetLayananKeywordSummary,
	)

	api.GET(
		"/layanan-keyword/:id",
		OptionalAuthMiddleware(),
		layananKeywordHandler.GetLayananKeywordByID,
	)

	// ==========================================================
	// PROTECTED ROUTES
	// ==========================================================

	protected := api.Group("/")
	protected.Use(AuthMiddleware())

	// ==========================================================
	// PENGELOLAAN PENGGUNA
	// SUPER ADMIN ONLY
	// ==========================================================

	pengguna := protected.Group("/pengguna")
	pengguna.Use(RequireRole(RoleSuperAdmin))

	pengguna.GET("", userHandler.GetUsers)
	pengguna.POST("", userHandler.CreateUser)
	pengguna.PUT("/:id", userHandler.UpdateUser)
	pengguna.DELETE("/:id", userHandler.DeleteUser)

	// ==========================================================
	// CRUD LAYANAN
	// ==========================================================

	protected.POST(
		"/layanan",
		layananHandler.CreateLayanan,
	)

	protected.PUT(
		"/layanan/:id",
		layananHandler.UpdateLayanan,
	)

	protected.DELETE(
		"/layanan/:id",
		layananHandler.DeleteLayanan,
	)

	// ==========================================================
	// CRUD WILAYAH
	// SUPER ADMIN ONLY
	// Pembatasan dilakukan di WilayahHandler.
	// ==========================================================

	protected.POST(
		"/wilayah",
		wilayahHandler.CreateWilayah,
	)

	protected.PUT(
		"/wilayah/:id",
		wilayahHandler.UpdateWilayah,
	)

	protected.DELETE(
		"/wilayah/:id",
		wilayahHandler.DeleteWilayah,
	)

	// ==========================================================
	// CRUD INSTANSI
	// ==========================================================

	protected.POST(
		"/instansi",
		instansiHandler.CreateInstansi,
	)

	protected.PUT(
		"/instansi/:id",
		instansiHandler.UpdateInstansi,
	)

	protected.DELETE(
		"/instansi/:id",
		instansiHandler.DeleteInstansi,
	)

	// ==========================================================
	// CRUD KATEGORI LAYANAN
	// SUPER ADMIN ONLY
	// Pembatasan dilakukan di KategoriLayananHandler.
	// ==========================================================

	protected.POST(
		"/kategori-layanan",
		kategoriLayananHandler.CreateKategoriLayanan,
	)

	protected.PUT(
		"/kategori-layanan/:id",
		kategoriLayananHandler.UpdateKategoriLayanan,
	)

	protected.DELETE(
		"/kategori-layanan/:id",
		kategoriLayananHandler.DeleteKategoriLayanan,
	)

	// ==========================================================
	// CRUD KEYWORD
	// ==========================================================

	protected.POST(
		"/layanan-keyword",
		layananKeywordHandler.CreateLayananKeyword,
	)

	protected.PUT(
		"/layanan-keyword/:id",
		layananKeywordHandler.UpdateLayananKeyword,
	)

	protected.DELETE(
		"/layanan-keyword/:id",
		layananKeywordHandler.DeleteLayananKeyword,
	)

	// ==========================================================
	// CRUD PENGADUAN
	// ==========================================================

	api.GET(
		"/pengaduan",
		OptionalAuthMiddleware(),
		pengaduanHandler.GetPengaduan,
	)

	api.GET(
		"/pengaduan/summary",
		OptionalAuthMiddleware(),
		pengaduanHandler.GetPengaduanSummary,
	)

	api.GET(
		"/pengaduan/:id",
		OptionalAuthMiddleware(),
		pengaduanHandler.GetPengaduanByID,
	)

	api.POST(
		"/pengaduan",
		OptionalAuthMiddleware(),
		pengaduanHandler.CreatePengaduan,
	)

	api.POST(
		"/pengaduan/simulasi",
		OptionalAuthMiddleware(),
		pengaduanHandler.SimulasiAduan,
	)

	api.PUT(
		"/pengaduan/:id",
		OptionalAuthMiddleware(),
		pengaduanHandler.UpdatePengaduan,
	)

	api.DELETE(
		"/pengaduan/:id",
		OptionalAuthMiddleware(),
		pengaduanHandler.DeletePengaduan,
	)

	// ==========================================================
	// SERVER
	// ==========================================================

	port := os.Getenv("PORT")

	if port == "" {
		port = "8080"
	}

	println("Server berjalan di port " + port)

	if err := router.Run(":" + port); err != nil {
		panic("Gagal menjalankan server: " + err.Error())
	}
}
