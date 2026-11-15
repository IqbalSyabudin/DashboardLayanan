package models

import "time"

type Pengaduan struct {
	ID uint64 `gorm:"primaryKey" json:"id"`

	// Nomor aduan unik: PGD-{KODE_WILAYAH}-{TAHUN}-{URUT}
	NoAduan string `gorm:"type:varchar(50);not null;uniqueIndex" json:"no_aduan"`

	// Sumber aduan
	Sumber string `gorm:"type:varchar(100);not null;default:'Otomatis (Chatbot Laras)'" json:"sumber"`

	// Data pelapor
	NamaPelapor   string `gorm:"type:varchar(255);not null" json:"nama_pelapor"`
	KontakPelapor string `gorm:"type:varchar(255)" json:"kontak_pelapor"`

	// Wilayah & OPD Tujuan
	WilayahID   *uint64 `gorm:"index" json:"wilayah_id"`
	OPDTujuan   string  `gorm:"type:varchar(255)" json:"opd_tujuan"`

	// Isi pengaduan
	JudulPengaduan    string `gorm:"type:varchar(500);not null" json:"judul_pengaduan"`
	IsiLaporanWarga   string `gorm:"type:text" json:"isi_laporan_warga"`

	// Status penanganan
	// Nilai: menunggu_verifikasi, diproses_opd, selesai, ditolak
	Status string `gorm:"type:varchar(50);not null;default:'menunggu_verifikasi';index" json:"status"`

	// Tanggapan admin
	TanggapanAdmin string `gorm:"type:text" json:"tanggapan_admin"`

	// Timestamps
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relasi
	Wilayah *Wilayah `gorm:"foreignKey:WilayahID" json:"wilayah,omitempty"`
}

func (Pengaduan) TableName() string {
	return "pengaduan"
}
