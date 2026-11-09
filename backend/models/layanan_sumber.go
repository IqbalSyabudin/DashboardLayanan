package models

import "time"

type LayananSumber struct {
	ID uint64 `gorm:"primaryKey" json:"id"`

	LayananID uint64 `gorm:"not null" json:"layanan_id"`

	URL        string     `gorm:"type:varchar(1000);not null" json:"url"`
	TipeSumber string     `gorm:"type:varchar(100);not null" json:"tipe_sumber"`
	VerifiedAt *time.Time `json:"verified_at"`
}

func (LayananSumber) TableName() string {
	return "layanan_sumber"
}
