package models

type Wilayah struct {
	ID   uint64 `gorm:"primaryKey" json:"id"`
	Nama string `gorm:"type:varchar(150);not null" json:"nama"`
	Tipe string `gorm:"type:varchar(50);not null" json:"tipe"`

	Instansi []Instansi `gorm:"foreignKey:WilayahID" json:"-"`
}

func (Wilayah) TableName() string {
	return "wilayah"
}
