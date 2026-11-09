package models

import "time"

type MonitoringLayanan struct {
	ID uint64 `gorm:"primaryKey" json:"id"`

	LayananID uint64 `gorm:"not null" json:"layanan_id"`

	JumlahQuery     int     `gorm:"not null;default:0" json:"jumlah_query"`
	JumlahResponse  int     `gorm:"not null;default:0" json:"jumlah_response"`
	FailedResponse  int     `gorm:"not null;default:0" json:"failed_response"`
	ConfidenceScore float64 `json:"confidence_score"`

	Periode time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"periode"`
}

func (MonitoringLayanan) TableName() string {
	return "monitoring_layanan"
}
