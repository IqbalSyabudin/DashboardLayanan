package models

import "time"

type LayananEmbedding struct {
	ID uint64 `gorm:"primaryKey" json:"id"`

	LayananID uint64 `gorm:"not null" json:"layanan_id"`

	VectorDB   string     `gorm:"type:varchar(100)" json:"vector_db"`
	Collection string     `gorm:"type:varchar(255)" json:"collection"`
	QdrantID   string     `gorm:"type:varchar(255)" json:"qdrant_id"`
	IndexedAt  *time.Time `json:"indexed_at"`
}

func (LayananEmbedding) TableName() string {
	return "layanan_embedding"
}
