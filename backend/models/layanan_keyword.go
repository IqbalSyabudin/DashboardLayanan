package models

type LayananKeyword struct {
	ID uint64 `gorm:"primaryKey" json:"id"`

	LayananID uint64 `gorm:"not null" json:"layanan_id"`
	Keyword   string `gorm:"type:varchar(255);not null" json:"keyword"`
}

func (LayananKeyword) TableName() string {
	return "layanan_keyword"
}
