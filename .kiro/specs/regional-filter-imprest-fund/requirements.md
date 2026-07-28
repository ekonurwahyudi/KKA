# Requirements Document

## Introduction

Fitur Regional Filter pada menu Imprest Fund memungkinkan pengguna untuk memfilter dan menampilkan jumlah "Belum Refund" berdasarkan regional yang dipilih melalui checkbox. Filter ini akan mempengaruhi perhitungan pada summary card "Belum Refund" untuk memberikan visibilitas yang lebih baik terhadap status refund per regional.

## Glossary

- **Regional_Filter_Component**: Komponen UI yang menampilkan daftar checkbox regional untuk filtering
- **Imprest_Fund_System**: Sistem manajemen Imprest Fund yang mengelola data imprest fund dan summary cards
- **Summary_Card_Belum_Refund**: Card yang menampilkan total nilai imprest fund dengan status 'open' atau 'proses' yang belum direfund
- **Regional**: Entitas yang merepresentasikan area regional dengan fields id, code, name, dan isActive
- **ImprestFund**: Entitas yang merepresentasikan data imprest fund dengan field regionalCode untuk alokasi anggaran regional
- **Checkbox_State**: State yang menyimpan daftar regional code yang dipilih oleh pengguna

## Requirements

### Requirement 1: Menampilkan Daftar Regional sebagai Checkbox Filter

**User Story:** Sebagai pengguna sistem keuangan, saya ingin melihat daftar regional dalam bentuk checkbox, sehingga saya dapat memilih regional mana yang ingin saya filter.

#### Acceptance Criteria

1. WHEN halaman Imprest Fund dimuat, THE Regional_Filter_Component SHALL menampilkan daftar checkbox untuk setiap regional yang aktif (isActive = true)
2. THE Regional_Filter_Component SHALL menampilkan nama regional (name) sebagai label checkbox
3. THE Regional_Filter_Component SHALL menampilkan checkbox dalam urutan alfabetis berdasarkan nama regional
4. WHEN tidak ada regional aktif di database, THE Regional_Filter_Component SHALL menampilkan pesan "Tidak ada regional tersedia"
5. THE Regional_Filter_Component SHALL menggunakan komponen Checkbox dari shadcn/ui untuk konsistensi UI

### Requirement 2: Mengelola State Checkbox Regional

**User Story:** Sebagai pengguna sistem keuangan, saya ingin dapat memilih dan membatalkan pilihan checkbox regional, sehingga saya dapat mengontrol filter yang diterapkan.

#### Acceptance Criteria

1. WHEN pengguna mengklik checkbox regional, THE Imprest_Fund_System SHALL mengubah state checkbox tersebut (checked/unchecked)
2. THE Imprest_Fund_System SHALL menyimpan daftar regional code yang dipilih dalam Checkbox_State
3. WHEN checkbox regional di-check, THE Imprest_Fund_System SHALL menambahkan regional code ke Checkbox_State
4. WHEN checkbox regional di-uncheck, THE Imprest_Fund_System SHALL menghapus regional code dari Checkbox_State
5. THE Imprest_Fund_System SHALL mempertahankan state checkbox saat komponen di-render ulang

### Requirement 3: Memfilter Data Imprest Fund Berdasarkan Regional

**User Story:** Sebagai pengguna sistem keuangan, saya ingin data imprest fund difilter berdasarkan regional yang saya pilih, sehingga saya hanya melihat data yang relevan.

#### Acceptance Criteria

1. WHEN tidak ada checkbox regional yang dipilih, THE Imprest_Fund_System SHALL menampilkan semua imprest fund tanpa filter regional
2. WHEN satu atau lebih checkbox regional dipilih, THE Imprest_Fund_System SHALL memfilter imprest fund berdasarkan regionalCode yang sesuai dengan Checkbox_State
3. THE Imprest_Fund_System SHALL menampilkan imprest fund yang memiliki regionalCode yang ada dalam Checkbox_State
4. WHEN imprest fund memiliki regionalCode null atau undefined, THE Imprest_Fund_System SHALL mengecualikan imprest fund tersebut dari hasil filter
5. THE Imprest_Fund_System SHALL memperbarui tampilan data imprest fund secara real-time saat checkbox regional berubah

### Requirement 4: Menghitung Ulang Summary Card "Belum Refund"

**User Story:** Sebagai pengguna sistem keuangan, saya ingin nilai "Belum Refund" dihitung berdasarkan regional yang saya pilih, sehingga saya dapat melihat total belum refund per regional.

#### Acceptance Criteria

1. WHEN tidak ada checkbox regional yang dipilih, THE Summary_Card_Belum_Refund SHALL menampilkan total dari semua imprest fund dengan status 'open' atau 'proses'
2. WHEN satu atau lebih checkbox regional dipilih, THE Summary_Card_Belum_Refund SHALL menghitung total hanya dari imprest fund yang memiliki regionalCode sesuai Checkbox_State dan status 'open' atau 'proses'
3. THE Summary_Card_Belum_Refund SHALL menampilkan nilai dalam format Rupiah (Rp X.XXX.XXX)
4. THE Summary_Card_Belum_Refund SHALL memperbarui nilai secara real-time saat Checkbox_State berubah
5. THE Summary_Card_Belum_Refund SHALL menghitung total dari field totalAmount pada setiap imprest fund yang memenuhi kriteria filter

### Requirement 5: Menampilkan Indikator Filter Aktif

**User Story:** Sebagai pengguna sistem keuangan, saya ingin melihat indikator visual bahwa filter regional sedang aktif, sehingga saya mengetahui bahwa data yang ditampilkan telah difilter.

#### Acceptance Criteria

1. WHEN satu atau lebih checkbox regional dipilih, THE Regional_Filter_Component SHALL menampilkan badge atau label yang menunjukkan jumlah regional yang dipilih
2. THE Regional_Filter_Component SHALL menampilkan teks "X regional dipilih" dimana X adalah jumlah checkbox yang di-check
3. WHEN tidak ada checkbox yang dipilih, THE Regional_Filter_Component SHALL tidak menampilkan badge atau label filter aktif
4. THE Regional_Filter_Component SHALL menggunakan warna yang kontras untuk badge agar mudah terlihat
5. THE Regional_Filter_Component SHALL memperbarui badge secara real-time saat Checkbox_State berubah

### Requirement 6: Menyediakan Opsi "Select All" dan "Clear All"

**User Story:** Sebagai pengguna sistem keuangan, saya ingin dapat memilih semua regional atau menghapus semua pilihan dengan cepat, sehingga saya tidak perlu mengklik checkbox satu per satu.

#### Acceptance Criteria

1. THE Regional_Filter_Component SHALL menampilkan tombol "Pilih Semua" untuk memilih semua checkbox regional
2. THE Regional_Filter_Component SHALL menampilkan tombol "Hapus Semua" untuk menghapus semua pilihan checkbox regional
3. WHEN tombol "Pilih Semua" diklik, THE Imprest_Fund_System SHALL menambahkan semua regional code aktif ke Checkbox_State
4. WHEN tombol "Hapus Semua" diklik, THE Imprest_Fund_System SHALL mengosongkan Checkbox_State
5. THE Regional_Filter_Component SHALL menonaktifkan tombol "Pilih Semua" ketika semua checkbox sudah dipilih
6. THE Regional_Filter_Component SHALL menonaktifkan tombol "Hapus Semua" ketika tidak ada checkbox yang dipilih

### Requirement 7: Mempertahankan Filter Saat Navigasi Tab

**User Story:** Sebagai pengguna sistem keuangan, saya ingin filter regional tetap aktif saat saya berpindah antar tab (All, Draft, Open, Proses, Close), sehingga saya tidak perlu mengatur ulang filter setiap kali berpindah tab.

#### Acceptance Criteria

1. WHEN pengguna berpindah dari satu tab ke tab lain, THE Imprest_Fund_System SHALL mempertahankan Checkbox_State
2. THE Imprest_Fund_System SHALL menerapkan filter regional pada data imprest fund di setiap tab
3. WHEN pengguna kembali ke tab sebelumnya, THE Regional_Filter_Component SHALL menampilkan checkbox dengan state yang sama seperti sebelum berpindah tab
4. THE Summary_Card_Belum_Refund SHALL tetap menampilkan nilai yang sesuai dengan filter regional aktif di setiap tab
5. THE Imprest_Fund_System SHALL menghitung ulang nilai "Belum Refund" berdasarkan filter regional dan status tab yang aktif

### Requirement 8: Menangani Perubahan Data Regional

**User Story:** Sebagai pengguna sistem keuangan, saya ingin filter regional diperbarui otomatis ketika ada perubahan data regional, sehingga filter selalu menampilkan data regional yang terkini.

#### Acceptance Criteria

1. WHEN data regional baru ditambahkan ke database, THE Regional_Filter_Component SHALL menampilkan checkbox untuk regional baru tersebut
2. WHEN regional dinonaktifkan (isActive = false), THE Regional_Filter_Component SHALL menghapus checkbox regional tersebut dari daftar
3. WHEN regional yang sedang dipilih dinonaktifkan, THE Imprest_Fund_System SHALL menghapus regional code tersebut dari Checkbox_State
4. THE Regional_Filter_Component SHALL memperbarui daftar checkbox secara otomatis menggunakan React hooks (useRegionals)
5. THE Imprest_Fund_System SHALL menghitung ulang Summary_Card_Belum_Refund setelah perubahan data regional

### Requirement 9: Responsivitas dan Aksesibilitas Filter

**User Story:** Sebagai pengguna sistem keuangan, saya ingin filter regional dapat digunakan dengan mudah di berbagai ukuran layar dan dapat diakses dengan keyboard, sehingga pengalaman pengguna optimal.

#### Acceptance Criteria

1. THE Regional_Filter_Component SHALL menampilkan checkbox dalam layout yang responsif untuk layar mobile, tablet, dan desktop
2. WHEN layar berukuran kecil (mobile), THE Regional_Filter_Component SHALL menampilkan checkbox dalam kolom tunggal
3. WHEN layar berukuran sedang atau besar, THE Regional_Filter_Component SHALL menampilkan checkbox dalam multiple kolom untuk efisiensi ruang
4. THE Regional_Filter_Component SHALL mendukung navigasi keyboard untuk memilih checkbox (Tab, Space, Enter)
5. THE Regional_Filter_Component SHALL memiliki label yang jelas dan aria-label untuk screen reader accessibility

### Requirement 10: Performa Filter dengan Data Besar

**User Story:** Sebagai pengguna sistem keuangan, saya ingin filter regional bekerja dengan cepat meskipun ada banyak data imprest fund, sehingga tidak ada lag atau delay yang mengganggu.

#### Acceptance Criteria

1. WHEN Checkbox_State berubah, THE Imprest_Fund_System SHALL memfilter data imprest fund dalam waktu kurang dari 100ms untuk dataset hingga 1000 records
2. THE Imprest_Fund_System SHALL menggunakan memoization (useMemo) untuk menghindari perhitungan ulang yang tidak perlu
3. THE Imprest_Fund_System SHALL mengoptimalkan filtering dengan menggunakan array methods yang efisien (filter, reduce)
4. THE Summary_Card_Belum_Refund SHALL menghitung total menggunakan memoized value untuk menghindari re-calculation pada setiap render
5. THE Regional_Filter_Component SHALL tidak menyebabkan re-render komponen lain yang tidak terkait dengan filter
