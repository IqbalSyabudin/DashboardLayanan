package main

import "time"

type DBLevelPemerintahan struct {
	ID   uint64 `gorm:"column:id;primaryKey"`
	Nama string `gorm:"column:nama"`
}

func (DBLevelPemerintahan) TableName() string {
	return "level_pemerintahan"
}

type DBWilayah struct {
	ID   uint64 `gorm:"column:id;primaryKey"`
	Nama string `gorm:"column:nama"`
	Tipe string `gorm:"column:tipe"`
}

func (DBWilayah) TableName() string {
	return "wilayah"
}

type DBInstansi struct {
	ID uint64 `gorm:"column:id;primaryKey"`

	WilayahID uint64 `gorm:"column:wilayah_id"`
	LevelID   uint64 `gorm:"column:level_id"`

	KodeInstansi string `gorm:"column:kode_instansi"`
	NamaInstansi string `gorm:"column:nama_instansi"`
	Singkatan    string `gorm:"column:singkatan"`
	Website      string `gorm:"column:website"`
	Aktif        bool   `gorm:"column:aktif"`
}

func (DBInstansi) TableName() string {
	return "instansi"
}

type DBKategoriLayanan struct {
	ID           uint64 `gorm:"column:id;primaryKey"`
	NamaKategori string `gorm:"column:nama_kategori"`
	Deskripsi    string `gorm:"column:deskripsi"`
}

func (DBKategoriLayanan) TableName() string {
	return "kategori_layanan"
}

type DBLayanan struct {
	ID uint64 `gorm:"column:id;primaryKey"`

	InstansiID uint64 `gorm:"column:instansi_id"`
	KategoriID uint64 `gorm:"column:kategori_id"`

	KodeLayanan string    `gorm:"column:kode_layanan"`
	NamaLayanan string    `gorm:"column:nama_layanan"`
	Status      string    `gorm:"column:status"`
	CreatedAt   time.Time `gorm:"column:created_at"`
}

func (DBLayanan) TableName() string {
	return "layanan"
}

type DBLayananDetail struct {
	ID uint64 `gorm:"column:id;primaryKey"`

	LayananID uint64 `gorm:"column:layanan_id"`

	Deskripsi     string `gorm:"column:deskripsi"`
	KebutuhanUser string `gorm:"column:kebutuhan_user"`
	Persyaratan   string `gorm:"column:persyaratan"`
	Prosedur      string `gorm:"column:prosedur"`
	Kanal         string `gorm:"column:kanal"`
}

func (DBLayananDetail) TableName() string {
	return "layanan_detail"
}

type DBLayananSumber struct {
	ID uint64 `gorm:"column:id;primaryKey"`

	LayananID uint64 `gorm:"column:layanan_id"`

	URL        string     `gorm:"column:url"`
	TipeSumber string     `gorm:"column:tipe_sumber"`
	VerifiedAt *time.Time `gorm:"column:verified_at"`
}

func (DBLayananSumber) TableName() string {
	return "layanan_sumber"
}

type DBLayananKeyword struct {
	ID uint64 `gorm:"column:id;primaryKey"`

	LayananID uint64 `gorm:"column:layanan_id"`
	Keyword   string `gorm:"column:keyword"`
}

func (DBLayananKeyword) TableName() string {
	return "layanan_keyword"
}

type DBLayananStatus struct {
	ID uint64 `gorm:"column:id;primaryKey"`

	LayananID uint64 `gorm:"column:layanan_id"`

	Status    string     `gorm:"column:status"`
	Catatan   string     `gorm:"column:catatan"`
	CheckedAt *time.Time `gorm:"column:checked_at"`
}

func (DBLayananStatus) TableName() string {
	return "layanan_status"
}
