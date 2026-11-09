package models

import "time"

type LayananStatus struct {
	ID uint64 `gorm:"primaryKey" json:"id"`

	LayananID uint64 `gorm:"not null" json:"layanan_id"`

	Status    string     `gorm:"type:varchar(50);not null" json:"status"`
	Catatan   string     `gorm:"type:text" json:"catatan"`
	CheckedAt *time.Time `json:"checked_at"`
}

func (LayananStatus) TableName() string {
	return "layanan_status"
}
