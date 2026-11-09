package models

type LevelPemerintahan struct {
	ID uint64 `gorm:"primaryKey" json:"id"`

	Nama string `gorm:"type:varchar(100);not null;unique" json:"nama"`
}

func (LevelPemerintahan) TableName() string {
	return "level_pemerintahan"
}
