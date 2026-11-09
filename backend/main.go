package main

import (
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"endpoint_api/handlers"
)

func main() {

	ConnectDatabase()

	// ==========================================================
	// USER MIGRATION
	// ==========================================================

	if err := DB.AutoMigrate(
		&User{},
	); err != nil {

		panic(
			"Gagal melakukan migration: " +
				err.Error(),
		)
	}

	println(
		"Database migration berhasil!",
	)

	// ==========================================================
	// IMPORT EXCEL
	// ==========================================================
	//
	// Jangan aktifkan setiap server berjalan.
	//
	// Data layanan yang sudah di-import tidak perlu
	// di-import ulang setiap kali server dijalankan.
	//
	// ImportAllExcel()

	// ==========================================================
	// SEED ADMIN
	// ==========================================================

	SeedAdmin()

	// ==========================================================
	// HANDLER
	// ==========================================================

	// ----------------------------------------------------------
	// LAYANAN
	// ----------------------------------------------------------

	layananHandler :=
		handlers.NewLayananHandler(DB)

	// ----------------------------------------------------------
	// WILAYAH
	// ----------------------------------------------------------

	wilayahHandler :=
		handlers.NewWilayahHandler(DB)

	// ----------------------------------------------------------
	// INSTANSI
	// ----------------------------------------------------------

	instansiHandler :=
		handlers.NewInstansiHandler(DB)

	// ----------------------------------------------------------
	// KATEGORI LAYANAN
	// ----------------------------------------------------------

	kategoriLayananHandler :=
		handlers.NewKategoriLayananHandler(DB)

	// ----------------------------------------------------------
	// STATUS LAYANAN
	// ----------------------------------------------------------

	layananStatusHandler :=
		handlers.NewLayananStatusHandler(DB)

	// ----------------------------------------------------------
	// KEYWORD
	// ----------------------------------------------------------

	layananKeywordHandler :=
		handlers.NewLayananKeywordHandler(DB)
	// ==========================================================
	// GIN
	// ==========================================================

	router :=
		gin.Default()

	// ==========================================================
	// CORS
	// ==========================================================

	router.Use(
		cors.New(
			cors.Config{

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
			},
		),
	)

	// ==========================================================
	// API GROUP
	// ==========================================================

	api :=
		router.Group("/api")

	// ==========================================================
	// AUTH
	// ==========================================================
	api.POST(
		"/login",
		Login,
	)

	// ==========================================================
	// LAYANAN
	// PUBLIC READ
	// ==========================================================

	api.GET(
		"/layanan",
		layananHandler.GetLayanans,
	)

	api.GET(
		"/layanan/:id",
		layananHandler.GetLayananByID,
	)

	// ==========================================================
	// WILAYAH
	// PUBLIC READ
	// ==========================================================

	api.GET(
		"/wilayah",
		wilayahHandler.GetWilayah,
	)

	api.GET(
		"/wilayah/:id",
		wilayahHandler.GetWilayahByID,
	)

	// ==========================================================
	// INSTANSI
	// PUBLIC READ
	// ==========================================================

	api.GET(
		"/instansi",
		instansiHandler.GetInstansi,
	)

	// IMPORTANT:
	// /summary harus berada sebelum /:id

	api.GET(
		"/instansi/summary",
		instansiHandler.GetInstansiSummary,
	)

	api.GET(
		"/instansi/:id",
		instansiHandler.GetInstansiByID,
	)

	// ==========================================================
	// KATEGORI LAYANAN
	// PUBLIC READ
	// ==========================================================

	api.GET(
		"/kategori-layanan",
		kategoriLayananHandler.GetKategoriLayanan,
	)

	api.GET(
		"/kategori-layanan/:id",
		kategoriLayananHandler.GetKategoriLayananByID,
	)

	// ==========================================================
	// STATUS
	// PUBLIC READ
	// ==========================================================

	api.GET(
		"/layanan-status",
		layananStatusHandler.GetLayananStatus,
	)

	// IMPORTANT:
	// /summary harus sebelum /:id

	api.GET(
		"/layanan-status/summary",
		layananStatusHandler.GetLayananStatusSummary,
	)

	api.GET(
		"/layanan-status/:id",
		layananStatusHandler.GetLayananStatusByID,
	)

	// ==========================================================
	// KEYWORD
	// PUBLIC READ
	// ==========================================================

	api.GET(
		"/layanan-keyword",
		layananKeywordHandler.GetLayananKeyword,
	)

	// IMPORTANT:
	// /summary harus sebelum /:id

	api.GET(
		"/layanan-keyword/summary",
		layananKeywordHandler.GetLayananKeywordSummary,
	)

	api.GET(
		"/layanan-keyword/:id",
		layananKeywordHandler.GetLayananKeywordByID,
	)

	// ==========================================================
	// PROTECTED ROUTES
	// ==========================================================

	protected :=
		api.Group("/")

	protected.Use(
		AuthMiddleware(),
	)

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
	// PORT
	// ==========================================================

	port :=
		os.Getenv("PORT")

	if port == "" {
		port = "8080"
	}

	println(
		"Server berjalan di port " +
			port,
	)

	// ==========================================================
	// RUN SERVER
	// ==========================================================

	if err := router.Run(
		":" + port,
	); err != nil {

		panic(
			"Gagal menjalankan server: " +
				err.Error(),
		)
	}
}
