package models

import "time"

type Layanan struct {
	ID uint64 `gorm:"primaryKey" json:"id"`

	InstansiID uint64 `gorm:"not null" json:"instansi_id"`
	KategoriID uint64 `gorm:"not null" json:"kategori_id"`

	KodeLayanan string `gorm:"type:varchar(100);not null;unique" json:"kode_layanan"`
	NamaLayanan string `gorm:"type:varchar(255);not null" json:"nama_layanan"`
	Status      string `gorm:"type:varchar(50);not null;default:Aktif" json:"status"`

	CreatedAt time.Time `json:"created_at"`

	Instansi Instansi        `gorm:"foreignKey:InstansiID" json:"instansi"`
	Kategori KategoriLayanan `gorm:"foreignKey:KategoriID" json:"kategori"`

	Detail     []LayananDetail     `gorm:"foreignKey:LayananID" json:"detail,omitempty"`
	Sumber     []LayananSumber     `gorm:"foreignKey:LayananID" json:"sumber,omitempty"`
	Keywords   []LayananKeyword    `gorm:"foreignKey:LayananID" json:"keywords,omitempty"`
	Statuses   []LayananStatus     `gorm:"foreignKey:LayananID" json:"statuses,omitempty"`
	Embedding  *LayananEmbedding   `gorm:"foreignKey:LayananID" json:"embedding,omitempty"`
	Monitoring []MonitoringLayanan `gorm:"foreignKey:LayananID" json:"monitoring,omitempty"`
}

func (Layanan) TableName() string {
	return "layanan"
}
