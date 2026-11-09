package main

import (
	"errors"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

// ============================================================
// KONFIGURASI IMPORT 7 FILE EXCEL
// ============================================================

type ExcelImportConfig struct {
	Path       string
	RegionCode string
	RegionName string
	RegionType string
}

var excelFiles = []ExcelImportConfig{
	{
		Path:       "data/data_bantul.xlsx",
		RegionCode: "BTL",
		RegionName: "Kabupaten Bantul",
		RegionType: "Kabupaten",
	},
	{
		Path:       "data/data_diy_prov.xlsx",
		RegionCode: "DIY",
		RegionName: "Daerah Istimewa Yogyakarta",
		RegionType: "Provinsi",
	},
	{
		Path:       "data/data_gunungkidul.xlsx",
		RegionCode: "GKD",
		RegionName: "Gunungkidul",
		RegionType: "Kabupaten",
	},
	{
		Path:       "data/data_jogjakota.xlsx",
		RegionCode: "YK",
		RegionName: "Kota Yogyakarta",
		RegionType: "Kota",
	},
	{
		Path:       "data/data_kulonprogo.xlsx",
		RegionCode: "KPG",
		RegionName: "Kulon Progo",
		RegionType: "Kabupaten",
	},
	{
		Path:       "data/data_pusat.xlsx",
		RegionCode: "PST",
		RegionName: "Indonesia",
		RegionType: "Nasional",
	},
	{
		Path:       "data/data_sleman.xlsx",
		RegionCode: "SLM",
		RegionName: "Sleman",
		RegionType: "Kabupaten",
	},
}

// ============================================================
// STATISTIK IMPORT
// ============================================================

type ImportStats struct {
	Inserted int
	Updated  int
	Skipped  int
}

// ============================================================
// IMPORT SEMUA FILE
// ============================================================

func ImportAllExcel() {

	var total ImportStats

	fmt.Println("============================================")
	fmt.Println("MULAI IMPORT 7 FILE EXCEL")
	fmt.Println("============================================")

	for _, config := range excelFiles {

		fmt.Println()
		fmt.Println("--------------------------------------------")
		fmt.Printf("File       : %s\n", config.Path)
		fmt.Printf("Kode       : %s\n", config.RegionCode)
		fmt.Printf("Wilayah    : %s\n", config.RegionName)
		fmt.Printf("Tipe       : %s\n", config.RegionType)
		fmt.Println("--------------------------------------------")

		stats, err := importSingleExcel(config)

		if err != nil {

			log.Printf(
				"GAGAL import %s: %v\n",
				config.Path,
				err,
			)

			continue
		}

		fmt.Printf(
			"Inserted : %d\n",
			stats.Inserted,
		)

		fmt.Printf(
			"Updated  : %d\n",
			stats.Updated,
		)

		fmt.Printf(
			"Skipped  : %d\n",
			stats.Skipped,
		)

		total.Inserted += stats.Inserted
		total.Updated += stats.Updated
		total.Skipped += stats.Skipped
	}

	fmt.Println()
	fmt.Println("============================================")
	fmt.Println("IMPORT SELESAI")
	fmt.Println("============================================")

	fmt.Printf(
		"Total Inserted : %d\n",
		total.Inserted,
	)

	fmt.Printf(
		"Total Updated  : %d\n",
		total.Updated,
	)

	fmt.Printf(
		"Total Skipped  : %d\n",
		total.Skipped,
	)

	fmt.Println("============================================")
}

// ============================================================
// IMPORT SATU FILE
// ============================================================

func importSingleExcel(
	config ExcelImportConfig,
) (ImportStats, error) {

	var stats ImportStats

	// BUKA FILE
	file, err := excelize.OpenFile(
		config.Path,
	)

	if err != nil {
		return stats, fmt.Errorf(
			"gagal membuka file: %w",
			err,
		)
	}

	defer file.Close()

	// BACA SHEET DATA_FINAL
	rows, err := file.GetRows(
		"DATA_FINAL",
	)

	if err != nil {
		return stats, fmt.Errorf(
			"gagal membaca sheet DATA_FINAL: %w",
			err,
		)
	}

	if len(rows) <= 1 {
		return stats, fmt.Errorf(
			"sheet DATA_FINAL tidak memiliki data",
		)
	}

	// HEADER
	headerIndex := make(
		map[string]int,
	)

	for i, header := range rows[0] {

		header = normalizeText(
			header,
		)

		if header != "" {
			headerIndex[header] = i
		}
	}

	fmt.Printf(
		"Jumlah baris data: %d\n",
		len(rows)-1,
	)

	// TRANSACTION PER FILE
	tx := DB.Begin()

	if tx.Error != nil {
		return stats, tx.Error
	}

	// LOOP BARIS EXCEL
	for i, row := range rows[1:] {

		excelRow := i + 2

		result, err := importExcelRow(
			tx,
			row,
			headerIndex,
			config,
			excelRow,
		)

		if err != nil {

			tx.Rollback()

			return stats, fmt.Errorf(
				"gagal pada Excel row %d: %w",
				excelRow,
				err,
			)
		}

		switch result {

		case "inserted":
			stats.Inserted++

		case "updated":
			stats.Updated++

		case "skipped":
			stats.Skipped++
		}
	}

	// COMMIT
	if err := tx.Commit().Error; err != nil {
		return stats, fmt.Errorf(
			"gagal commit transaction: %w",
			err,
		)
	}

	return stats, nil
}

// ============================================================
// IMPORT SATU BARIS
// ============================================================

func importExcelRow(
	tx *gorm.DB,
	row []string,
	headerIndex map[string]int,
	config ExcelImportConfig,
	excelRow int,
) (string, error) {

	// NILAI ASLI
	dinasOriginal := getExcelValue(
		row,
		headerIndex,
		"Dinas",
	)

	dinasCorrection := getExcelValue(
		row,
		headerIndex,
		"Dinas Koreksi",
	)

	dinas := firstNonEmpty(
		dinasCorrection,
		dinasOriginal,
	)

	layananOriginal := getExcelValue(
		row,
		headerIndex,
		"Layanan",
	)

	layananCorrection := getExcelValue(
		row,
		headerIndex,
		"Layanan Koreksi",
	)

	namaLayanan := firstNonEmpty(
		layananCorrection,
		layananOriginal,
	)

	// SKIP JIKA NAMA LAYANAN KOSONG
	if namaLayanan == "" {

		fmt.Printf(
			"SKIP row %d: nama layanan kosong\n",
			excelRow,
		)

		return "skipped", nil
	}

	// LEVEL PEMERINTAHAN
	levelRaw := getExcelValue(
		row,
		headerIndex,
		"Level pemerintahan",
	)

	levelName := normalizeLevel(
		levelRaw,
	)

	if levelName == "" {
		levelName = "Kabupaten"
	}

	level, err := findOrCreateLevel(
		tx,
		levelName,
	)

	if err != nil {
		return "", err
	}

	// WILAYAH CANONICAL
	wilayahName := config.RegionName
	wilayahType := config.RegionType

	wilayah, err := findOrCreateWilayah(
		tx,
		wilayahName,
		wilayahType,
	)

	if err != nil {
		return "", err
	}

	// INSTANSI
	if dinas == "" {
		dinas = "Instansi Belum Ditentukan"
	}

	website := getExcelValue(
		row,
		headerIndex,
		"Sumber resmi",
	)

	if !isURL(website) {
		website = ""
	}

	singkatan := deriveSingkatan(
		dinasOriginal,
	)

	instansi, err := findOrCreateInstansi(
		tx,
		dinas,
		singkatan,
		website,
		wilayah.ID,
		level.ID,
		config.RegionCode,
	)

	if err != nil {
		return "", err
	}

	// KATEGORI
	kategoriName := getExcelValue(
		row,
		headerIndex,
		"Kategori Sangkan",
	)

	if kategoriName == "" {
		kategoriName = "Lainnya"
	}

	kategori, err := findOrCreateKategori(
		tx,
		kategoriName,
	)

	if err != nil {
		return "", err
	}

	// RAW ROW
	rawRow := parseRawRow(
		getExcelValue(
			row,
			headerIndex,
			"Raw Row",
		),
		excelRow,
	)

	// ========================================================
	// KODE LAYANAN
	// ========================================================
	kodeLayanan := makeKodeLayanan(
		config.RegionCode,
		dinas,
		rawRow,
	)

	// ========================================================
	// STATUS LAYANAN
	// ========================================================

	statusLayanan := getExcelValue(
		row,
		headerIndex,
		"Status",
	)

	if statusLayanan == "" {
		statusLayanan = "Aktif"
	}

	// ========================================================
	// CREATE / UPDATE LAYANAN
	// ========================================================

	layanan, action, err := findOrCreateLayanan(
		tx,
		kodeLayanan,
		namaLayanan,
		statusLayanan,
		instansi.ID,
		kategori.ID,
	)

	if err != nil {
		return "", err
	}

	// ========================================================
	// DETAIL
	// ========================================================

	err = upsertLayananDetail(
		tx,
		layanan.ID,
		getExcelValue(
			row,
			headerIndex,
			"Deskripsi layanan",
		),
		getExcelValue(
			row,
			headerIndex,
			"Kebutuhan/use case",
		),
		getExcelValue(
			row,
			headerIndex,
			"Persyaratan",
		),
		getExcelValue(
			row,
			headerIndex,
			"Prosedur",
		),
		getExcelValue(
			row,
			headerIndex,
			"Online/offline",
		),
	)

	if err != nil {
		return "", err
	}

	// ========================================================
	// SUMBER
	// ========================================================

	lastVerifiedRaw := getExcelValue(
		row,
		headerIndex,
		"Last verified",
	)

	verifiedAt, err := parseDate(
		lastVerifiedRaw,
	)

	if err != nil {
		return "", fmt.Errorf(
			"format Last verified tidak valid: %w",
			err,
		)
	}

	sourceType := getExcelValue(
		row,
		headerIndex,
		"Source Type",
	)

	if sourceType == "" {
		sourceType = "UNKNOWN"
	}

	urls := uniqueStrings(
		[]string{
			getExcelValue(
				row,
				headerIndex,
				"Link",
			),

			getExcelValue(
				row,
				headerIndex,
				"Source Detail URL",
			),
		},
	)

	for _, url := range urls {

		if err := upsertLayananSumber(
			tx,
			layanan.ID,
			url,
			sourceType,
			verifiedAt,
		); err != nil {
			return "", err
		}
	}

	// ========================================================
	// KEYWORD
	// ========================================================

	keywords := parseKeywords(
		getExcelValue(
			row,
			headerIndex,
			"Kata kunci",
		),
	)

	for _, keyword := range keywords {

		if err := upsertKeyword(
			tx,
			layanan.ID,
			keyword,
		); err != nil {
			return "", err
		}
	}

	// ========================================================
	// STATUS KNOWLEDGE BASE
	// ========================================================

	auditStatus := getExcelValue(
		row,
		headerIndex,
		"Audit Status",
	)

	scrapeStatus := getExcelValue(
		row,
		headerIndex,
		"Scrape Status",
	)

	rawStatus := firstNonEmpty(
		auditStatus,
		scrapeStatus,
	)

	knowledgeStatus := mapKnowledgeStatus(
		rawStatus,
	)

	confidence := getExcelValue(
		row,
		headerIndex,
		"Confidence",
	)

	verificationNote := getExcelValue(
		row,
		headerIndex,
		"Verification Note",
	)

	noteParts := []string{}

	if verificationNote != "" {

		noteParts = append(
			noteParts,
			verificationNote,
		)
	}

	if confidence != "" {

		noteParts = append(
			noteParts,
			"Confidence="+confidence,
		)
	}

	if auditStatus != "" {

		noteParts = append(
			noteParts,
			"Audit Status="+auditStatus,
		)
	}

	if scrapeStatus != "" {

		noteParts = append(
			noteParts,
			"Scrape Status="+scrapeStatus,
		)
	}

	noteParts = append(
		noteParts,
		fmt.Sprintf(
			"Raw Row=%d",
			rawRow,
		),
	)

	finalNote := strings.Join(
		noteParts,
		" ",
	)

	if err := insertStatus(
		tx,
		layanan.ID,
		knowledgeStatus,
		finalNote,
		verifiedAt,
	); err != nil {
		return "", err
	}

	return action, nil
}

// ============================================================
// LEVEL PEMERINTAHAN
// ============================================================

func findOrCreateLevel(
	tx *gorm.DB,
	name string,
) (*DBLevelPemerintahan, error) {

	var level DBLevelPemerintahan

	err := tx.
		Where(
			"LOWER(nama) = LOWER(?)",
			name,
		).
		First(&level).
		Error

	if err == nil {
		return &level, nil
	}

	if !errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {
		return nil, err
	}

	level = DBLevelPemerintahan{
		Nama: name,
	}

	if err := tx.Create(
		&level,
	).Error; err != nil {
		return nil, err
	}

	return &level, nil
}

// ============================================================
// WILAYAH
// ============================================================

func findOrCreateWilayah(
	tx *gorm.DB,
	name string,
	tipe string,
) (*DBWilayah, error) {

	var wilayah DBWilayah

	err := tx.
		Where(
			"LOWER(nama) = LOWER(?) AND LOWER(tipe) = LOWER(?)",
			name,
			tipe,
		).
		First(&wilayah).
		Error

	if err == nil {
		return &wilayah, nil
	}

	if !errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {
		return nil, err
	}

	wilayah = DBWilayah{
		Nama: name,
		Tipe: tipe,
	}

	if err := tx.Create(
		&wilayah,
	).Error; err != nil {
		return nil, err
	}

	return &wilayah, nil
}

// ============================================================
// INSTANSI
// ============================================================

func findOrCreateInstansi(
	tx *gorm.DB,
	nama string,
	singkatan string,
	website string,
	wilayahID uint64,
	levelID uint64,
	regionCode string,
) (*DBInstansi, error) {

	var instansi DBInstansi

	err := tx.
		Where(
			"wilayah_id = ? AND LOWER(nama_instansi) = LOWER(?)",
			wilayahID,
			nama,
		).
		First(&instansi).
		Error

	if err == nil {

		changed := false

		if instansi.Website == "" &&
			website != "" {

			instansi.Website = website
			changed = true
		}

		if instansi.Singkatan == "" &&
			singkatan != "" {

			instansi.Singkatan = singkatan
			changed = true
		}

		if instansi.LevelID == 0 {
			instansi.LevelID = levelID
			changed = true
		}

		if changed {

			if err := tx.Save(
				&instansi,
			).Error; err != nil {
				return nil, err
			}
		}

		return &instansi, nil
	}

	if !errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {
		return nil, err
	}

	// ========================================================
	// BUAT KODE INSTANSI
	// ========================================================

	codeBase := makeInstansiCode(
		regionCode,
		nama,
	)

	code := codeBase
	counter := 1

	for {

		var existing DBInstansi

		err := tx.
			Where(
				"kode_instansi = ?",
				code,
			).
			First(&existing).
			Error

		if errors.Is(
			err,
			gorm.ErrRecordNotFound,
		) {
			break
		}

		if err != nil {
			return nil, err
		}

		if strings.EqualFold(
			existing.NamaInstansi,
			nama,
		) &&
			existing.WilayahID == wilayahID {

			return &existing, nil
		}

		code = fmt.Sprintf(
			"%s-%d",
			codeBase,
			counter,
		)

		counter++
	}

	aktif := true

	if strings.EqualFold(
		nama,
		"Instansi Belum Ditentukan",
	) {
		aktif = false
	}

	instansi = DBInstansi{
		WilayahID:    wilayahID,
		LevelID:      levelID,
		KodeInstansi: code,
		NamaInstansi: nama,
		Singkatan:    singkatan,
		Website:      website,
		Aktif:        aktif,
	}

	if err := tx.Create(
		&instansi,
	).Error; err != nil {
		return nil, err
	}

	return &instansi, nil
}

// ============================================================
// KATEGORI
// ============================================================

func findOrCreateKategori(
	tx *gorm.DB,
	name string,
) (*DBKategoriLayanan, error) {

	var kategori DBKategoriLayanan

	err := tx.
		Where(
			"LOWER(nama_kategori) = LOWER(?)",
			name,
		).
		First(&kategori).
		Error

	if err == nil {
		return &kategori, nil
	}

	if !errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {
		return nil, err
	}

	kategori = DBKategoriLayanan{
		NamaKategori: name,
	}

	if err := tx.Create(
		&kategori,
	).Error; err != nil {
		return nil, err
	}

	return &kategori, nil
}

// ============================================================
// LAYANAN
// ============================================================

func findOrCreateLayanan(
	tx *gorm.DB,
	kode string,
	nama string,
	status string,
	instansiID uint64,
	kategoriID uint64,
) (*DBLayanan, string, error) {

	var layanan DBLayanan

	err := tx.
		Where(
			"kode_layanan = ?",
			kode,
		).
		First(&layanan).
		Error

	if err == nil {

		changed := false

		if layanan.NamaLayanan != nama {
			layanan.NamaLayanan = nama
			changed = true
		}

		if layanan.Status != status {
			layanan.Status = status
			changed = true
		}

		if layanan.InstansiID != instansiID {
			layanan.InstansiID = instansiID
			changed = true
		}

		if layanan.KategoriID != kategoriID {
			layanan.KategoriID = kategoriID
			changed = true
		}

		if changed {

			if err := tx.Save(
				&layanan,
			).Error; err != nil {
				return nil, "", err
			}
		}

		return &layanan, "updated", nil
	}

	if !errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {
		return nil, "", err
	}

	layanan = DBLayanan{
		KodeLayanan: kode,
		NamaLayanan: nama,
		Status:      status,
		InstansiID:  instansiID,
		KategoriID:  kategoriID,
		CreatedAt:   time.Now(),
	}

	if err := tx.Create(
		&layanan,
	).Error; err != nil {
		return nil, "", err
	}

	return &layanan, "inserted", nil
}

// ============================================================
// DETAIL LAYANAN
// ============================================================

func upsertLayananDetail(
	tx *gorm.DB,
	layananID uint64,
	deskripsi string,
	kebutuhan string,
	persyaratan string,
	prosedur string,
	kanal string,
) error {

	var detail DBLayananDetail

	err := tx.
		Where(
			"layanan_id = ?",
			layananID,
		).
		First(&detail).
		Error

	if errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {

		detail = DBLayananDetail{
			LayananID:     layananID,
			Deskripsi:     deskripsi,
			KebutuhanUser: kebutuhan,
			Persyaratan:   persyaratan,
			Prosedur:      prosedur,
			Kanal:         kanal,
		}

		return tx.Create(
			&detail,
		).Error
	}

	if err != nil {
		return err
	}

	detail.Deskripsi = deskripsi
	detail.KebutuhanUser = kebutuhan
	detail.Persyaratan = persyaratan
	detail.Prosedur = prosedur
	detail.Kanal = kanal

	return tx.Save(
		&detail,
	).Error
}

// ============================================================
// SUMBER
// ============================================================

func upsertLayananSumber(
	tx *gorm.DB,
	layananID uint64,
	url string,
	tipe string,
	verifiedAt *time.Time,
) error {

	url = strings.TrimSpace(url)

	if url == "" {
		return nil
	}

	var source DBLayananSumber

	err := tx.
		Where(
			"layanan_id = ? AND url = ?",
			layananID,
			url,
		).
		First(&source).
		Error

	if errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {

		source = DBLayananSumber{
			LayananID:  layananID,
			URL:        url,
			TipeSumber: tipe,
			VerifiedAt: verifiedAt,
		}

		return tx.Create(
			&source,
		).Error
	}

	if err != nil {
		return err
	}

	source.TipeSumber = tipe
	source.VerifiedAt = verifiedAt

	return tx.Save(
		&source,
	).Error
}

// ============================================================
// KEYWORD
// ============================================================

func upsertKeyword(
	tx *gorm.DB,
	layananID uint64,
	keyword string,
) error {

	keyword = normalizeText(
		keyword,
	)

	if keyword == "" {
		return nil
	}

	var existing DBLayananKeyword

	err := tx.
		Where(
			"layanan_id = ? AND LOWER(keyword) = LOWER(?)",
			layananID,
			keyword,
		).
		First(&existing).
		Error

	if err == nil {
		return nil
	}

	if !errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {
		return err
	}

	item := DBLayananKeyword{
		LayananID: layananID,
		Keyword:   keyword,
	}

	return tx.Create(
		&item,
	).Error
}

// ============================================================
// STATUS KNOWLEDGE BASE
// ============================================================

func insertStatus(
	tx *gorm.DB,
	layananID uint64,
	status string,
	catatan string,
	checkedAt *time.Time,
) error {

	var existing DBLayananStatus

	err := tx.
		Where(
			"layanan_id = ? AND status = ? AND COALESCE(catatan, '') = ?",
			layananID,
			status,
			catatan,
		).
		First(&existing).
		Error

	if err == nil {
		return nil
	}

	if !errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {
		return err
	}

	item := DBLayananStatus{
		LayananID: layananID,
		Status:    status,
		Catatan:   catatan,
		CheckedAt: checkedAt,
	}

	return tx.Create(
		&item,
	).Error
}

// ============================================================
// MAPPING STATUS EXCEL → KNOWLEDGE BASE
// ============================================================

func mapKnowledgeStatus(
	raw string,
) string {

	status := strings.ToUpper(
		strings.TrimSpace(raw),
	)

	switch status {

	case "RAW":
		return "RAW"

	case "CLEANED":
		return "CLEANED"

	case "VERIFIED":
		return "VERIFIED"

	case "READY_RAG":
		return "READY_RAG"

	case "NEED_REVIEW":
		return "NEED_REVIEW"

	case "PARTIAL":
		return "NEED_REVIEW"

	case "OUT_OF_SCOPE":
		return "NEED_REVIEW"

	case "RAW_LINK_NEED_REVIEW":
		return "NEED_REVIEW"

	case "NO_SOURCE":
		return "NEED_REVIEW"

	case "":
		return "RAW"

	default:
		return "NEED_REVIEW"
	}
}

// ============================================================
// KODE INSTANSI
// ============================================================

func makeInstansiCode(
	regionCode string,
	name string,
) string {

	return fmt.Sprintf(
		"%s-%s",
		regionCode,
		makeShortCode(name),
	)
}

// ============================================================
// KODE LAYANAN
// ============================================================

func makeKodeLayanan(
	regionCode string,
	instansi string,
	rawRow int,
) string {

	instansiCode := makeShortCode(
		instansi,
	)

	return fmt.Sprintf(
		"%s-%s-%03d",
		regionCode,
		instansiCode,
		rawRow,
	)
}

// ============================================================
// SHORT CODE
// ============================================================

func makeShortCode(
	value string,
) string {

	tokens := strings.FieldsFunc(
		value,
		func(r rune) bool {
			return !unicode.IsLetter(r) &&
				!unicode.IsDigit(r)
		},
	)

	if len(tokens) == 0 {
		return "UNKNOWN"
	}

	if len(tokens) == 1 &&
		len([]rune(tokens[0])) <= 15 {

		return strings.ToUpper(
			tokens[0],
		)
	}

	stopWords := map[string]bool{
		"DAN":       true,
		"DI":        true,
		"KE":        true,
		"DARI":      true,
		"KABUPATEN": true,
		"KOTA":      true,
		"PROVINSI":  true,
	}

	var builder strings.Builder

	for _, token := range tokens {

		upper := strings.ToUpper(
			token,
		)

		if stopWords[upper] {
			continue
		}

		runes := []rune(upper)

		if len(runes) > 0 {
			builder.WriteRune(
				runes[0],
			)
		}
	}

	result := builder.String()

	if result == "" {

		result = strings.ToUpper(
			tokens[0],
		)
	}

	runes := []rune(result)

	if len(runes) > 12 {

		result = string(
			runes[:12],
		)
	}

	return result
}

// ============================================================
// SINGKATAN
// ============================================================

func deriveSingkatan(
	dinas string,
) string {

	dinas = strings.TrimSpace(
		dinas,
	)

	if dinas == "" {
		return ""
	}

	tokens := strings.FieldsFunc(
		dinas,
		func(r rune) bool {
			return !unicode.IsLetter(r) &&
				!unicode.IsDigit(r)
		},
	)

	if len(tokens) != 1 {
		return ""
	}

	value := tokens[0]

	if len([]rune(value)) > 20 {
		return ""
	}

	return value
}

// ============================================================
// NORMALISASI LEVEL PEMERINTAHAN
// ============================================================

func normalizeLevel(
	value string,
) string {

	value = strings.ToUpper(
		normalizeText(value),
	)

	switch {

	case strings.HasPrefix(
		value,
		"PUSAT",
	):
		return "Pusat"

	case strings.Contains(
		value,
		"PROVINSI",
	):
		return "Provinsi"

	case strings.Contains(
		value,
		"KABUPATEN",
	):
		return "Kabupaten"

	case strings.Contains(
		value,
		"KOTA",
	):
		return "Kota"

	default:
		return normalizeText(value)
	}
}

// ============================================================
// PARSE KEYWORD
// ============================================================

func parseKeywords(
	value string,
) []string {

	if strings.TrimSpace(value) == "" {
		return nil
	}

	re := regexp.MustCompile(
		`[,;|\n]+`,
	)

	parts := re.Split(
		value,
		-1,
	)

	result := []string{}

	seen := make(
		map[string]bool,
	)

	for _, part := range parts {

		keyword := normalizeText(
			part,
		)

		if keyword == "" {
			continue
		}

		key := strings.ToLower(
			keyword,
		)

		if seen[key] {
			continue
		}

		seen[key] = true

		result = append(
			result,
			keyword,
		)
	}

	return result
}

// ============================================================
// PARSE TANGGAL
// ============================================================

func parseDate(
	value string,
) (*time.Time, error) {

	value = strings.TrimSpace(
		value,
	)

	if value == "" {
		return nil, nil
	}

	formats := []string{
		"2006-01-02",
		"2006-01-02 15:04:05",
		time.RFC3339,
	}

	for _, format := range formats {

		t, err := time.ParseInLocation(
			format,
			value,
			time.Local,
		)

		if err == nil {
			return &t, nil
		}
	}

	return nil, fmt.Errorf(
		"tanggal tidak dikenali: %s",
		value,
	)
}

// ============================================================
// PARSE RAW ROW
// ============================================================

func parseRawRow(
	value string,
	fallback int,
) int {

	value = strings.TrimSpace(
		value,
	)

	if value == "" {
		return fallback
	}

	// Excel kadang membaca angka seperti:
	//
	// 82.0
	//
	// Ubah menjadi:
	//
	// 82

	if strings.HasSuffix(
		value,
		".0",
	) {

		value = strings.TrimSuffix(
			value,
			".0",
		)
	}

	number, err := strconv.Atoi(
		value,
	)

	if err != nil {
		return fallback
	}

	return number
}

// ============================================================
// GET VALUE DARI EXCEL
// ============================================================

func getExcelValue(
	row []string,
	headerIndex map[string]int,
	column string,
) string {

	index, exists := headerIndex[normalizeText(column)]

	if !exists {
		return ""
	}

	if index >= len(row) {
		return ""
	}

	return normalizeText(
		row[index],
	)
}

// ============================================================
// NORMALIZE TEXT
// ============================================================

func normalizeText(
	value string,
) string {

	return strings.Join(
		strings.Fields(
			strings.TrimSpace(
				value,
			),
		),
		" ",
	)
}

// ============================================================
// FIRST NON EMPTY
// ============================================================

func firstNonEmpty(
	values ...string,
) string {

	for _, value := range values {

		value = strings.TrimSpace(
			value,
		)

		if value != "" {
			return value
		}
	}

	return ""
}

// ============================================================
// UNIQUE STRING
// ============================================================

func uniqueStrings(
	values []string,
) []string {

	result := []string{}

	seen := make(
		map[string]bool,
	)

	for _, value := range values {

		value = strings.TrimSpace(
			value,
		)

		if value == "" {
			continue
		}

		key := strings.ToLower(
			value,
		)

		if seen[key] {
			continue
		}

		seen[key] = true

		result = append(
			result,
			value,
		)
	}

	return result
}

// ============================================================
// CEK URL
// ============================================================

func isURL(
	value string,
) bool {

	value = strings.ToLower(
		strings.TrimSpace(
			value,
		),
	)

	return strings.HasPrefix(
		value,
		"http://",
	) ||
		strings.HasPrefix(
			value,
			"https://",
		)
}
