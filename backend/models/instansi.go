package models

type Instansi struct {
	ID uint64 `gorm:"primaryKey" json:"id"`

	WilayahID uint64 `gorm:"not null" json:"wilayah_id"`
	LevelID   uint64 `gorm:"not null" json:"level_id"`

	KodeInstansi string `gorm:"type:varchar(100);not null;unique" json:"kode_instansi"`
	NamaInstansi string `gorm:"type:varchar(255);not null" json:"nama_instansi"`
	Singkatan    string `gorm:"type:varchar(100)" json:"singkatan"`
	Website      string `gorm:"type:varchar(500)" json:"website"`
	Aktif        bool   `gorm:"not null;default:true" json:"aktif"`

	Wilayah Wilayah           `gorm:"foreignKey:WilayahID" json:"wilayah"`
	Level   LevelPemerintahan `gorm:"foreignKey:LevelID" json:"level_pemerintahan"`

	Layanan []Layanan `gorm:"foreignKey:InstansiID" json:"-"`
}

func (Instansi) TableName() string {
	return "instansi"
}
