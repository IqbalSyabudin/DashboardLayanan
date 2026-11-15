package main

import (
	"log"
	"time"

	"endpoint_api/models"
)

func SeedPengaduan() {
	var count int64
	DB.Model(&models.Pengaduan{}).Count(&count)

	// Jika sudah ada data, jangan timpa
	if count > 0 {
		log.Println("Data pengaduan sudah tersedia:", count)
		return
	}

	// Cari map wilayah berdasarkan nama
	var wilayahList []models.Wilayah
	DB.Find(&wilayahList)

	wilayahMap := make(map[string]uint64)
	for _, w := range wilayahList {
		wilayahMap[w.Nama] = w.ID
	}

	getWilayahID := func(nama string) *uint64 {
		for key, id := range wilayahMap {
			if key == nama {
				val := id
				return &val
			}
		}
		// default fallback first id if available
		if len(wilayahList) > 0 {
			val := wilayahList[0].ID
			return &val
		}
		return nil
	}

	baseTime := time.Date(2026, 11, 14, 9, 15, 0, 0, time.Local)

	samples := []models.Pengaduan{
		{
			NoAduan:         "PGD-DIY-2026-001",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Siti Aminah",
			KontakPelapor:   "0812-2745-8810",
			WilayahID:       getWilayahID("Kab. Bantul"),
			OPDTujuan:       "Dinkes Kab. Bantul",
			JudulPengaduan:  "Link pendaftaran PBI BPJS Kesehatan di web Dinkes tidak bisa dibuka",
			IsiLaporanWarga: "Saat saya klik tombol Website di jawaban Chatbot Laras untuk syarat PBI BPJS, halaman muncul error 404.",
			Status:          "selesai",
			TanggapanAdmin:  "Terima kasih atas laporannya. Tautan resmi Dinkes Bantul sudah kami perbarui dan re-index ke Chatbot Laras.",
			CreatedAt:       baseTime,
			UpdatedAt:       baseTime,
		},
		{
			NoAduan:         "PGD-YK-2026-002",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Budi Santoso",
			KontakPelapor:   "budi.santoso92@gmail.com",
			WilayahID:       getWilayahID("Kota Yogyakarta"),
			OPDTujuan:       "Disdukcapil Kota Yogyakarta",
			JudulPengaduan:  "Informasi syarat cetak ulang e-KTP hilang kurang lengkap bagian surat polisi",
			IsiLaporanWarga: "Syarat penerbitan ulang e-KTP di chatbot belum mencantumkan masa berlaku surat kehilangan dari kepolisian.",
			Status:          "diproses_opd",
			TanggapanAdmin:  "Laporan sedang diteruskan ke Disdukcapil Kota Yogyakarta untuk pembaruan SOP.",
			CreatedAt:       baseTime.Add(1 * time.Hour + 25*time.Minute),
			UpdatedAt:       baseTime.Add(1 * time.Hour + 25*time.Minute),
		},
		{
			NoAduan:         "PGD-SLM-2026-003",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Rina Kusumawardani",
			KontakPelapor:   "0857-4312-9090",
			WilayahID:       getWilayahID("Kab. Sleman"),
			OPDTujuan:       "DPMPTSP Kab. Sleman",
			JudulPengaduan:  "Kendala pengajuan NIB OSS-RBA untuk usaha kuliner rumahan",
			IsiLaporanWarga: "Mohon panduan terkait OSS RBA karena kode KBLI untuk katering rumahan tidak muncul di bot.",
			Status:          "menunggu_verifikasi",
			TanggapanAdmin:  "",
			CreatedAt:       baseTime.Add(4 * time.Hour + 5*time.Minute),
			UpdatedAt:       baseTime.Add(4 * time.Hour + 5*time.Minute),
		},
		{
			NoAduan:         "PGD-BTL-2026-004",
			Sumber:          "Input Admin (Loket / 112)",
			NamaPelapor:     "Ahmad Fauzi",
			KontakPelapor:   "0813-9200-1145",
			WilayahID:       getWilayahID("Provinsi DIY"),
			OPDTujuan:       "Dishub Provinsi DIY",
			JudulPengaduan:  "Jadwal armada Bus Trans Jogja koridor 3A sore hari sering terlambat",
			IsiLaporanWarga: "Jadwal bus di halte Giwangan sering selisih 30 menit dari jadwal resmi yang tertera di sistem informasi.",
			Status:          "diproses_opd",
			TanggapanAdmin:  "Sedang dilakukan koordinasi dengan Dishub DIY untuk sinkronisasi jadwal real-time.",
			CreatedAt:       baseTime.Add(-17 * time.Hour),
			UpdatedAt:       baseTime.Add(-17 * time.Hour),
		},
		{
			NoAduan:         "PGD-KLP-2026-005",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Dwi Lestari",
			KontakPelapor:   "dwilestari.kp@yahoo.com",
			WilayahID:       getWilayahID("Kab. Kulon Progo"),
			OPDTujuan:       "Disdikbud Kab. Kulon Progo",
			JudulPengaduan:  "Permohonan informasi alur pendaftaran Kartu Cerdas siswa SMA",
			IsiLaporanWarga: "Apakah pendaftaran beasiswa Kartu Cerdas tahun ini bisa dilakukan online atau harus datang ke dinas?",
			Status:          "selesai",
			TanggapanAdmin:  "Informasi alur pendaftaran Kartu Cerdas telah diperbarui pada sistem dan tautan portal Disdikbud sudah ditambahkan.",
			CreatedAt:       baseTime.Add(-46 * time.Hour),
			UpdatedAt:       baseTime.Add(-46 * time.Hour),
		},
		{
			NoAduan:         "PGD-GNK-2026-006",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Siti Aminah #6",
			KontakPelapor:   "0812-2745-8810",
			WilayahID:       getWilayahID("Kab. Gunungkidul"),
			OPDTujuan:       "OPD Terkait Kab. Gunungkidul",
			JudulPengaduan:  "Link pendaftaran PBI BPJS Kesehatan di web Dinkes tidak bisa dibuka (Kab. Gunungkidul)",
			IsiLaporanWarga: "Tautan pada portal pendaftaran bantuan BPJS tidak dapat diakses.",
			Status:          "selesai",
			TanggapanAdmin:  "Tautan alternatif telah diaktifkan.",
			CreatedAt:       baseTime.Add(-2 * time.Hour),
			UpdatedAt:       baseTime.Add(-2 * time.Hour),
		},
		{
			NoAduan:         "PGD-PST-2026-007",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Budi Santoso #7",
			KontakPelapor:   "budi.santoso92@gmail.com",
			WilayahID:       getWilayahID("Pusat"),
			OPDTujuan:       "OPD Terkait Pusat",
			JudulPengaduan:  "Informasi syarat cetak ulang e-KTP hilang kurang lengkap bagian surat polisi (Pusat)",
			IsiLaporanWarga: "Perlu konfirmasi apakah surat kehilangan dari polsek setempat berlaku lintas provinsi.",
			Status:          "diproses_opd",
			TanggapanAdmin:  "Sedang dikoordinasikan dengan Ditjen Dukcapil Kemendagri.",
			CreatedAt:       baseTime.Add(-3 * time.Hour),
			UpdatedAt:       baseTime.Add(-3 * time.Hour),
		},
		{
			NoAduan:         "PGD-DIY-2026-008",
			Sumber:          "Input Admin (Loket / 112)",
			NamaPelapor:     "Rina Kusumawardani #8",
			KontakPelapor:   "0857-4312-9090",
			WilayahID:       getWilayahID("Provinsi DIY"),
			OPDTujuan:       "OPD Terkait Provinsi DIY",
			JudulPengaduan:  "Kendala pengajuan NIB OSS-RBA untuk usaha kuliner rumahan (Provinsi DIY)",
			IsiLaporanWarga: "Kendala sinkronisasi data NIK dengan AHU saat pengajuan izin usaha.",
			Status:          "menunggu_verifikasi",
			TanggapanAdmin:  "",
			CreatedAt:       baseTime.Add(-4 * time.Hour),
			UpdatedAt:       baseTime.Add(-4 * time.Hour),
		},
		{
			NoAduan:         "PGD-YK-2026-009",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Ahmad Fauzi #9",
			KontakPelapor:   "0813-9200-1145",
			WilayahID:       getWilayahID("Kota Yogyakarta"),
			OPDTujuan:       "OPD Terkait Kota Yogyakarta",
			JudulPengaduan:  "Jadwal armada Bus Trans Jogja koridor 3A sore hari sering terlambat (Kota Yogyakarta)",
			IsiLaporanWarga: "Kemacetan di seputar Malioboro menyebabkan headway bus melebihi toleransi.",
			Status:          "diproses_opd",
			TanggapanAdmin:  "Sedang evaluasi penambahan rute alternatif sore hari.",
			CreatedAt:       baseTime.Add(-5 * time.Hour),
			UpdatedAt:       baseTime.Add(-5 * time.Hour),
		},
		{
			NoAduan:         "PGD-SLM-2026-010",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Dwi Lestari #10",
			KontakPelapor:   "dwilestari.kp@yahoo.com",
			WilayahID:       getWilayahID("Kab. Sleman"),
			OPDTujuan:       "OPD Terkait Kab. Sleman",
			JudulPengaduan:  "Permohonan informasi alur pendaftaran Kartu Cerdas siswa SMA (Kab. Sleman)",
			IsiLaporanWarga: "Verifikasi kartu cerdas di kecamatan Sleman membutuhkan panduan lebih rinci.",
			Status:          "selesai",
			TanggapanAdmin:  "Petunjuk teknis telah diunggah ke portal resmi.",
			CreatedAt:       baseTime.Add(-6 * time.Hour),
			UpdatedAt:       baseTime.Add(-6 * time.Hour),
		},
		// 11 to 25 to reach 25 items matching the exact count in Figma:
		// Total: 25 (Menunggu: 5, Diproses: 10, Selesai: 10)
		{
			NoAduan:         "PGD-KLP-2026-011",
			Sumber:          "Input Admin (Loket / 112)",
			NamaPelapor:     "Budi Santoso #11",
			KontakPelapor:   "budi.santoso92@gmail.com",
			WilayahID:       getWilayahID("Kab. Kulon Progo"),
			OPDTujuan:       "Disdukcapil Kab. Kulon Progo",
			JudulPengaduan:  "Informasi syarat cetak ulang e-KTP hilang kurang lengkap",
			IsiLaporanWarga: "Surat kehilangan perlu format baku dari kepolisian setempat.",
			Status:          "diproses_opd",
			TanggapanAdmin:  "",
			CreatedAt:       baseTime.Add(-7 * time.Hour),
			UpdatedAt:       baseTime.Add(-7 * time.Hour),
		},
		{
			NoAduan:         "PGD-KLP-2026-012",
			Sumber:          "Input Admin (Loket / 112)",
			NamaPelapor:     "Budi Santoso #12",
			KontakPelapor:   "budi.santoso92@gmail.com",
			WilayahID:       getWilayahID("Kab. Kulon Progo"),
			OPDTujuan:       "OPD Terkait Kab. Kulon Progo",
			JudulPengaduan:  "Informasi syarat cetak ulang e-KTP hilang kurang lengkap bagian surat polisi (Kab. Kulon Progo)",
			IsiLaporanWarga: "Pertanyaan formulir pelaporan e-KTP hilang di wilayah Kulon Progo.",
			Status:          "diproses_opd",
			TanggapanAdmin:  "Diteruskan ke Disdukcapil Kulon Progo.",
			CreatedAt:       baseTime.Add(-8 * time.Hour),
			UpdatedAt:       baseTime.Add(-8 * time.Hour),
		},
		{
			NoAduan:         "PGD-GNK-2026-013",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Rina Kusumawardani #13",
			KontakPelapor:   "0857-4312-9090",
			WilayahID:       getWilayahID("Kab. Gunungkidul"),
			OPDTujuan:       "OPD Terkait Kab. Gunungkidul",
			JudulPengaduan:  "Kendala pengajuan NIB OSS-RBA untuk usaha kuliner rumahan (Kab. Gunungkidul)",
			IsiLaporanWarga: "Kendala sertifikat laik higiene sanitasi untuk usaha boga.",
			Status:          "menunggu_verifikasi",
			TanggapanAdmin:  "",
			CreatedAt:       baseTime.Add(-9 * time.Hour),
			UpdatedAt:       baseTime.Add(-9 * time.Hour),
		},
		{
			NoAduan:         "PGD-PST-2026-014",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Ahmad Fauzi #14",
			KontakPelapor:   "0813-9200-1145",
			WilayahID:       getWilayahID("Pusat"),
			OPDTujuan:       "OPD Terkait Pusat",
			JudulPengaduan:  "Jadwal armada Bus Trans Jogja koridor 3A sore hari sering terlambat (Pusat)",
			IsiLaporanWarga: "Integrasi jadwal bus pada aplikasi peta nasional tidak sinkron.",
			Status:          "diproses_opd",
			TanggapanAdmin:  "Dalam proses perbaikan feed API transportasi.",
			CreatedAt:       baseTime.Add(-10 * time.Hour),
			UpdatedAt:       baseTime.Add(-10 * time.Hour),
		},
		{
			NoAduan:         "PGD-DIY-2026-015",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Dwi Lestari #15",
			KontakPelapor:   "dwilestari.kp@yahoo.com",
			WilayahID:       getWilayahID("Provinsi DIY"),
			OPDTujuan:       "OPD Terkait Provinsi DIY",
			JudulPengaduan:  "Permohonan informasi alur pendaftaran Kartu Cerdas siswa SMA (Provinsi DIY)",
			IsiLaporanWarga: "Pertanyaan mengenai kuota beasiswa siswa SMA/SMK DIY tahun ajaran baru.",
			Status:          "selesai",
			TanggapanAdmin:  "Data kuota telah diperbarui di kanal informasi publik.",
			CreatedAt:       baseTime.Add(-11 * time.Hour),
			UpdatedAt:       baseTime.Add(-11 * time.Hour),
		},
		{
			NoAduan:         "PGD-YK-2026-016",
			Sumber:          "Input Admin (Loket / 112)",
			NamaPelapor:     "Siti Aminah #16",
			KontakPelapor:   "0812-2745-8810",
			WilayahID:       getWilayahID("Kota Yogyakarta"),
			OPDTujuan:       "OPD Terkait Kota Yogyakarta",
			JudulPengaduan:  "Link pendaftaran PBI BPJS Kesehatan di web Dinkes tidak bisa dibuka (Kota Yogyakarta)",
			IsiLaporanWarga: "Layanan pendaftaran faskes pertama tidak menampilkan opsi puskesmas setempat.",
			Status:          "selesai",
			TanggapanAdmin:  "Daftar faskes telah diperbarui.",
			CreatedAt:       baseTime.Add(-12 * time.Hour),
			UpdatedAt:       baseTime.Add(-12 * time.Hour),
		},
		{
			NoAduan:         "PGD-SLM-2026-017",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Budi Santoso #17",
			KontakPelapor:   "budi.santoso92@gmail.com",
			WilayahID:       getWilayahID("Kab. Sleman"),
			OPDTujuan:       "OPD Terkait Kab. Sleman",
			JudulPengaduan:  "Informasi syarat cetak ulang e-KTP hilang kurang lengkap bagian surat polisi (Kab. Sleman)",
			IsiLaporanWarga: "Klarifikasi layanan jemput bola cetak e-KTP di balai warga.",
			Status:          "diproses_opd",
			TanggapanAdmin:  "Jadwal layanan jemput bola telah dikirimkan via email.",
			CreatedAt:       baseTime.Add(-13 * time.Hour),
			UpdatedAt:       baseTime.Add(-13 * time.Hour),
		},
		{
			NoAduan:         "PGD-BTL-2026-018",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Rina Kusumawardani #18",
			KontakPelapor:   "0857-4312-9090",
			WilayahID:       getWilayahID("Kab. Bantul"),
			OPDTujuan:       "OPD Terkait Kab. Bantul",
			JudulPengaduan:  "Kendala pengajuan NIB OSS-RBA untuk usaha kuliner rumahan (Kab. Bantul)",
			IsiLaporanWarga: "Kendala cetak sertifikat standar di kecamatan Bantul.",
			Status:          "menunggu_verifikasi",
			TanggapanAdmin:  "",
			CreatedAt:       baseTime.Add(-14 * time.Hour),
			UpdatedAt:       baseTime.Add(-14 * time.Hour),
		},
		{
			NoAduan:         "PGD-KLP-2026-019",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Ahmad Fauzi #19",
			KontakPelapor:   "0813-9200-1145",
			WilayahID:       getWilayahID("Kab. Kulon Progo"),
			OPDTujuan:       "OPD Terkait Kab. Kulon Progo",
			JudulPengaduan:  "Jadwal armada Bus Trans Jogja koridor 3A sore hari sering terlambat (Kab. Kulon Progo)",
			IsiLaporanWarga: "Koneksi bus bandara YIA ke pusat kota saat kedatangan malam.",
			Status:          "diproses_opd",
			TanggapanAdmin:  "Sedang dikoordinasikan penambahan armada malam.",
			CreatedAt:       baseTime.Add(-15 * time.Hour),
			UpdatedAt:       baseTime.Add(-15 * time.Hour),
		},
		{
			NoAduan:         "PGD-GNK-2026-020",
			Sumber:          "Input Admin (Loket / 112)",
			NamaPelapor:     "Dwi Lestari #20",
			KontakPelapor:   "dwilestari.kp@yahoo.com",
			WilayahID:       getWilayahID("Kab. Gunungkidul"),
			OPDTujuan:       "OPD Terkait Kab. Gunungkidul",
			JudulPengaduan:  "Permohonan informasi alur pendaftaran Kartu Cerdas siswa SMA (Kab. Gunungkidul)",
			IsiLaporanWarga: "Permohonan beasiswa siswa berprestasi di pelosok Gunungkidul.",
			Status:          "selesai",
			TanggapanAdmin:  "Alur verifikasi offline di kantor korwil disdik sudah ditambahkan.",
			CreatedAt:       baseTime.Add(-16 * time.Hour),
			UpdatedAt:       baseTime.Add(-16 * time.Hour),
		},
		{
			NoAduan:         "PGD-PST-2026-021",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Siti Aminah #21",
			KontakPelapor:   "0812-2745-8810",
			WilayahID:       getWilayahID("Pusat"),
			OPDTujuan:       "OPD Terkait Pusat",
			JudulPengaduan:  "Link pendaftaran PBI BPJS Kesehatan di web Dinkes tidak bisa dibuka (Pusat)",
			IsiLaporanWarga: "Tautan integrasi sistem SatuSehat dengan BPJS PBI.",
			Status:          "selesai",
			TanggapanAdmin:  "API SatuSehat telah terhubung kembali.",
			CreatedAt:       baseTime.Add(-18 * time.Hour),
			UpdatedAt:       baseTime.Add(-18 * time.Hour),
		},
		{
			NoAduan:         "PGD-DIY-2026-022",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Budi Santoso #22",
			KontakPelapor:   "budi.santoso92@gmail.com",
			WilayahID:       getWilayahID("Provinsi DIY"),
			OPDTujuan:       "OPD Terkait Provinsi DIY",
			JudulPengaduan:  "Informasi syarat cetak ulang e-KTP hilang kurang lengkap bagian surat polisi (Provinsi DIY)",
			IsiLaporanWarga: "Pertanyaan perihal legalisir surat kehilangan di instansi provinsi.",
			Status:          "diproses_opd",
			TanggapanAdmin:  "Sudah dijawab melalui email resmi PPID.",
			CreatedAt:       baseTime.Add(-19 * time.Hour),
			UpdatedAt:       baseTime.Add(-19 * time.Hour),
		},
		{
			NoAduan:         "PGD-YK-2026-023",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Rina Kusumawardani #23",
			KontakPelapor:   "0857-4312-9090",
			WilayahID:       getWilayahID("Kota Yogyakarta"),
			OPDTujuan:       "OPD Terkait Kota Yogyakarta",
			JudulPengaduan:  "Kendala pengajuan NIB OSS-RBA untuk usaha kuliner rumahan (Kota Yogyakarta)",
			IsiLaporanWarga: "Pelatihan OSS bagi UMKM kelurahan di Kota Jogja.",
			Status:          "menunggu_verifikasi",
			TanggapanAdmin:  "",
			CreatedAt:       baseTime.Add(-20 * time.Hour),
			UpdatedAt:       baseTime.Add(-20 * time.Hour),
		},
		{
			NoAduan:         "PGD-SLM-2026-024",
			Sumber:          "Input Admin (Loket / 112)",
			NamaPelapor:     "Ahmad Fauzi #24",
			KontakPelapor:   "0813-9200-1145",
			WilayahID:       getWilayahID("Kab. Sleman"),
			OPDTujuan:       "OPD Terkait Kab. Sleman",
			JudulPengaduan:  "Jadwal armada Bus Trans Jogja koridor 3A sore hari sering terlambat (Kab. Sleman)",
			IsiLaporanWarga: "Antrian panjang di halte Condongcatur pada jam pulang kerja.",
			Status:          "diproses_opd",
			TanggapanAdmin:  "Dishub DIY menambahkan 2 bus cadangan di simpul Condongcatur.",
			CreatedAt:       baseTime.Add(-21 * time.Hour),
			UpdatedAt:       baseTime.Add(-21 * time.Hour),
		},
		{
			NoAduan:         "PGD-BTL-2026-025",
			Sumber:          "Otomatis (Chatbot Laras)",
			NamaPelapor:     "Dwi Lestari #25",
			KontakPelapor:   "dwilestari.kp@yahoo.com",
			WilayahID:       getWilayahID("Kab. Bantul"),
			OPDTujuan:       "OPD Terkait Kab. Bantul",
			JudulPengaduan:  "Permohonan informasi alur pendaftaran Kartu Cerdas siswa SMA (Kab. Bantul)",
			IsiLaporanWarga: "Syarat SKTM untuk kelengkapan administrasi Kartu Cerdas.",
			Status:          "selesai",
			TanggapanAdmin:  "Persyaratan SKTM telah diselaraskan dengan data DTKS Dinsos.",
			CreatedAt:       baseTime.Add(-22 * time.Hour),
			UpdatedAt:       baseTime.Add(-22 * time.Hour),
		},
	}

	for _, item := range samples {
		DB.Create(&item)
	}

	log.Println("Seeding 25 sampel pengaduan berhasil!")
}
