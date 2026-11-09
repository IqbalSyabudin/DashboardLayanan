package models

type LayananDetail struct {
	ID uint64 `gorm:"primaryKey" json:"id"`

	LayananID uint64 `gorm:"not null" json:"layanan_id"`

	Deskripsi     string `gorm:"type:text" json:"deskripsi"`
	KebutuhanUser string `gorm:"type:text" json:"kebutuhan_user"`
	Persyaratan   string `gorm:"type:text" json:"persyaratan"`
	Prosedur      string `gorm:"type:text" json:"prosedur"`
	Kanal         string `gorm:"type:varchar(100)" json:"kanal"`
}

func (LayananDetail) TableName() string {
	return "layanan_detail"
}
