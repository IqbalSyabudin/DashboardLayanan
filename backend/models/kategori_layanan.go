package models

type KategoriLayanan struct {
	ID           uint64 `gorm:"primaryKey" json:"id"`
	NamaKategori string `gorm:"type:varchar(150);not null;unique" json:"nama_kategori"`
	Deskripsi    string `gorm:"type:text" json:"deskripsi"`

	Layanan []Layanan `gorm:"foreignKey:KategoriID" json:"-"`
}

func (KategoriLayanan) TableName() string {
	return "kategori_layanan"
}
