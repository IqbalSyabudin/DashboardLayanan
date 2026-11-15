package main

import "time"

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"unique;not null" json:"username"`
	Password  string    `gorm:"not null" json:"-"`
	Role      string    `gorm:"not null;index" json:"role"`
	WilayahID *uint64   `gorm:"index" json:"wilayah_id"`
	CreatedAt time.Time `json:"created_at"`
}