# Requirements Document

## Introduction

Fitur Period Filter pada menu Imprest Fund memungkinkan pengguna untuk memfilter dan menampilkan data imprest fund "belum bayar" (status 'open' atau 'proses') berdasarkan periode waktu. Pengguna dapat memilih tahun (year), mode filter antara Quartal (Q1, Q2, Q3, Q4) atau Bulan (Januari - Desember), kemudian memilih periode spesifik yang ingin ditampilkan. Contoh penggunaan: pengguna memilih Regional 1 + Q1 + 2026 untuk melihat data belum bayar di Regional 1, Quartal 1, tahun 2026. Filter ini akan mempengaruhi data yang ditampilkan pada tabel dan perhitungan pada summary card "Belum Refund".

## Glossary

- **Period_Filter_Component**: Komponen UI yang menampilkan pilihan tahun (year selector), mode filter (Quartal/Bulan), dan opsi periode spesifik untuk filtering
- **Imprest_Fund_System**: Sistem manajemen Imprest Fund yang mengelola data imprest fund, filtering, dan summary cards
- **Summary_Card_Belum_Refund**: Card yang menampilkan total nilai imprest fund dengan status 'open' atau 'proses' yang belum direfund
- **Filter_Mode**: State yang menyimpan mode filter aktif, bernilai 'quartal' atau 'bulan'
- **Selected_Period**: State yang menyimpan periode spesifik yang dipilih oleh pengguna (Q1-Q4 untuk quartal, atau nama bulan untuk bulan)
- **Selected_Year**: State yang menyimpan tahun yang dipilih oleh pengguna untuk filtering (contoh: 2024, 2025, 2026)
- **Available_Years**: Daftar tahun yang tersedia untuk dipilih, diambil dari distinct years pada field createdAt dari data imprest fund yang ada
- **ImprestFund**: Entitas yang merepresentasikan data imprest fund dengan field createdAt (DateTime) untuk filtering berdasarkan periode
- **Quartal**: Pembagian tahun menjadi 4 periode: Q1 (Januari-Maret), Q2 (April-Juni), Q3 (Juli-September), Q4 (Oktober-Desember)

## Requirements

### Requirement 1: Menampilkan Komponen Filter Periode

**User Story:** Sebagai pengguna sistem keuangan, saya ingin melihat komponen filter periode pada halaman Imprest Fund, sehingga saya dapat memfilter data berdasarkan tahun dan waktu.

#### Acceptance Criteria

1. THE Period_Filter_Component SHALL menampilkan pilihan tahun (year selector) menggunakan komponen Select dari shadcn/ui
2. THE Period_Filter_Component SHALL menampilkan pilihan mode filter berupa "Quartal" dan "Bulan" menggunakan komponen Select dari shadcn/ui
3. WHEN mode filter "Quartal" dipilih, THE Period_Filter_Component SHALL menampilkan opsi Q1, Q2, Q3, dan Q4 sebagai pilihan periode
4. WHEN mode filter "Bulan" dipilih, THE Period_Filter_Component SHALL menampilkan opsi Januari sampai Desember sebagai pilihan periode
5. THE Period_Filter_Component SHALL ditempatkan berdekatan dengan filter regional yang sudah ada untuk konsistensi layout
6. THE Period_Filter_Component SHALL menggunakan komponen Popover dari shadcn/ui agar konsisten dengan pola filter regional yang sudah ada

### Requirement 2: Mengelola State Filter Periode

**User Story:** Sebagai pengguna sistem keuangan, saya ingin dapat memilih dan mengubah tahun, mode filter, serta periode spesifik, sehingga saya dapat mengontrol data yang ditampilkan.

#### Acceptance Criteria

1. WHEN pengguna memilih mode filter "Quartal", THE Imprest_Fund_System SHALL menyimpan nilai 'quartal' pada Filter_Mode
2. WHEN pengguna memilih mode filter "Bulan", THE Imprest_Fund_System SHALL menyimpan nilai 'bulan' pada Filter_Mode
3. WHEN pengguna memilih periode spesifik, THE Imprest_Fund_System SHALL menyimpan nilai periode tersebut pada Selected_Period
4. WHEN Filter_Mode berubah dari 'quartal' ke 'bulan' atau sebaliknya, THE Imprest_Fund_System SHALL mengosongkan Selected_Period
5. THE Imprest_Fund_System SHALL mempertahankan Filter_Mode, Selected_Period, dan Selected_Year saat komponen di-render ulang
6. WHEN pengguna memilih tahun dari year selector, THE Imprest_Fund_System SHALL menyimpan nilai tahun tersebut pada Selected_Year
7. THE Imprest_Fund_System SHALL menggunakan tahun berjalan sebagai default value untuk Selected_Year

### Requirement 3: Memfilter Data Imprest Fund Berdasarkan Quartal

**User Story:** Sebagai pengguna sistem keuangan, saya ingin memfilter data imprest fund berdasarkan quartal pada tahun yang dipilih, sehingga saya dapat melihat data pada periode quartal tertentu.

#### Acceptance Criteria

1. WHEN Selected_Period bernilai "Q1", THE Imprest_Fund_System SHALL memfilter imprest fund yang memiliki createdAt antara 1 Januari dan 31 Maret pada Selected_Year
2. WHEN Selected_Period bernilai "Q2", THE Imprest_Fund_System SHALL memfilter imprest fund yang memiliki createdAt antara 1 April dan 30 Juni pada Selected_Year
3. WHEN Selected_Period bernilai "Q3", THE Imprest_Fund_System SHALL memfilter imprest fund yang memiliki createdAt antara 1 Juli dan 30 September pada Selected_Year
4. WHEN Selected_Period bernilai "Q4", THE Imprest_Fund_System SHALL memfilter imprest fund yang memiliki createdAt antara 1 Oktober dan 31 Desember pada Selected_Year
5. WHEN Selected_Period kosong dan Filter_Mode bernilai 'quartal', THE Imprest_Fund_System SHALL memfilter imprest fund yang memiliki createdAt pada Selected_Year

### Requirement 4: Memfilter Data Imprest Fund Berdasarkan Bulan

**User Story:** Sebagai pengguna sistem keuangan, saya ingin memfilter data imprest fund berdasarkan bulan pada tahun yang dipilih, sehingga saya dapat melihat data pada bulan tertentu.

#### Acceptance Criteria

1. WHEN Selected_Period bernilai nama bulan tertentu, THE Imprest_Fund_System SHALL memfilter imprest fund yang memiliki createdAt pada bulan tersebut di Selected_Year
2. THE Imprest_Fund_System SHALL menggunakan index bulan (0-11) dari field createdAt untuk mencocokkan dengan Selected_Period
3. WHEN Selected_Period kosong dan Filter_Mode bernilai 'bulan', THE Imprest_Fund_System SHALL memfilter imprest fund yang memiliki createdAt pada Selected_Year
4. THE Imprest_Fund_System SHALL memperbarui tampilan data imprest fund secara real-time saat Selected_Period atau Selected_Year berubah

### Requirement 5: Menghitung Ulang Summary Card "Belum Refund" Berdasarkan Periode

**User Story:** Sebagai pengguna sistem keuangan, saya ingin nilai "Belum Refund" dihitung berdasarkan tahun dan periode yang saya pilih, sehingga saya dapat melihat total belum refund pada periode tertentu.

#### Acceptance Criteria

1. WHEN Selected_Period memiliki nilai, THE Summary_Card_Belum_Refund SHALL menghitung total hanya dari imprest fund yang memiliki createdAt sesuai periode dan tahun yang dipilih serta status 'open' atau 'proses'
2. WHEN Selected_Period kosong, THE Summary_Card_Belum_Refund SHALL menghitung total dari imprest fund yang memiliki createdAt pada Selected_Year dengan status 'open' atau 'proses'
3. THE Summary_Card_Belum_Refund SHALL menampilkan nilai dalam format Rupiah (Rp X.XXX.XXX)
4. THE Summary_Card_Belum_Refund SHALL memperbarui nilai secara real-time saat Selected_Period, Selected_Year, atau Filter_Mode berubah
5. THE Summary_Card_Belum_Refund SHALL menghitung total dari field totalAmount pada setiap imprest fund yang memenuhi kriteria filter periode, filter tahun, dan filter regional secara bersamaan

### Requirement 6: Menampilkan Indikator Filter Periode Aktif

**User Story:** Sebagai pengguna sistem keuangan, saya ingin melihat indikator visual bahwa filter periode sedang aktif, sehingga saya mengetahui bahwa data yang ditampilkan telah difilter berdasarkan waktu.

#### Acceptance Criteria

1. WHEN Selected_Period memiliki nilai, THE Period_Filter_Component SHALL menampilkan badge yang menunjukkan periode yang sedang aktif
2. THE Period_Filter_Component SHALL menampilkan teks yang menunjukkan mode, periode aktif, dan tahun yang dipilih (contoh: "Q1 2026" atau "Januari 2026")
3. WHEN Selected_Period kosong, THE Period_Filter_Component SHALL menampilkan teks yang menunjukkan tahun yang dipilih (contoh: "2026" atau "Semua Periode" jika default)
4. THE Period_Filter_Component SHALL menyediakan tombol untuk menghapus filter periode yang aktif (reset ke semua periode)
5. THE Period_Filter_Component SHALL memperbarui indikator secara real-time saat Filter_Mode, Selected_Period, atau Selected_Year berubah

### Requirement 7: Integrasi Filter Periode dengan Filter Regional

**User Story:** Sebagai pengguna sistem keuangan, saya ingin filter periode (termasuk tahun) bekerja bersamaan dengan filter regional, sehingga saya dapat memfilter data berdasarkan kombinasi regional, tahun, dan periode waktu.

#### Acceptance Criteria

1. WHEN filter regional dan filter periode keduanya aktif, THE Imprest_Fund_System SHALL menerapkan kedua filter secara bersamaan (AND logic)
2. THE Imprest_Fund_System SHALL memfilter imprest fund yang memenuhi kriteria regional DAN kriteria periode (tahun + quartal/bulan) secara bersamaan
3. THE Summary_Card_Belum_Refund SHALL menghitung total berdasarkan imprest fund yang memenuhi kedua kriteria filter
4. WHEN salah satu filter direset, THE Imprest_Fund_System SHALL tetap menerapkan filter lainnya yang masih aktif
5. THE Imprest_Fund_System SHALL memperbarui tampilan data dan summary card secara real-time saat salah satu filter berubah

### Requirement 8: Mempertahankan Filter Periode Saat Navigasi Tab

**User Story:** Sebagai pengguna sistem keuangan, saya ingin filter periode (termasuk tahun) tetap aktif saat saya berpindah antar tab (All, Draft, Open, Proses, Close), sehingga saya tidak perlu mengatur ulang filter setiap kali berpindah tab.

#### Acceptance Criteria

1. WHEN pengguna berpindah dari satu tab ke tab lain, THE Imprest_Fund_System SHALL mempertahankan Filter_Mode, Selected_Period, dan Selected_Year
2. THE Imprest_Fund_System SHALL menerapkan filter periode (termasuk tahun) pada data imprest fund di setiap tab
3. WHEN pengguna kembali ke tab sebelumnya, THE Period_Filter_Component SHALL menampilkan pilihan filter dengan state yang sama seperti sebelum berpindah tab
4. THE Summary_Card_Belum_Refund SHALL tetap menampilkan nilai yang sesuai dengan filter periode dan tahun aktif di setiap tab

### Requirement 9: Performa Filter Periode

**User Story:** Sebagai pengguna sistem keuangan, saya ingin filter periode bekerja dengan cepat tanpa lag, sehingga pengalaman pengguna tetap optimal.

#### Acceptance Criteria

1. WHEN Filter_Mode, Selected_Period, atau Selected_Year berubah, THE Imprest_Fund_System SHALL memfilter data imprest fund dalam waktu kurang dari 100ms untuk dataset hingga 1000 records
2. THE Imprest_Fund_System SHALL menggunakan memoization (useMemo) untuk menghindari perhitungan ulang yang tidak perlu saat filter periode berubah
3. THE Imprest_Fund_System SHALL mengoptimalkan filtering dengan membandingkan tanggal menggunakan getMonth() dan getFullYear() dari field createdAt
4. THE Summary_Card_Belum_Refund SHALL menghitung total menggunakan memoized value yang bergantung pada Filter_Mode, Selected_Period, Selected_Year, dan data imprest fund

### Requirement 10: Responsivitas Komponen Filter Periode

**User Story:** Sebagai pengguna sistem keuangan, saya ingin komponen filter periode dapat digunakan dengan mudah di berbagai ukuran layar, sehingga pengalaman pengguna optimal di mobile maupun desktop.

#### Acceptance Criteria

1. THE Period_Filter_Component SHALL menampilkan layout yang responsif untuk layar mobile, tablet, dan desktop
2. WHEN layar berukuran kecil (mobile), THE Period_Filter_Component SHALL menampilkan year selector, select mode, dan select periode secara vertikal (stacked)
3. WHEN layar berukuran sedang atau besar, THE Period_Filter_Component SHALL menampilkan year selector, select mode, dan select periode secara horizontal (inline)
4. THE Period_Filter_Component SHALL mendukung interaksi touch pada perangkat mobile
5. THE Period_Filter_Component SHALL memiliki label yang jelas dan aria-label untuk screen reader accessibility

### Requirement 11: Mengelola Daftar Tahun yang Tersedia

**User Story:** Sebagai pengguna sistem keuangan, saya ingin daftar tahun pada year selector diambil dari data imprest fund yang ada, sehingga saya hanya melihat tahun-tahun yang memiliki data.

#### Acceptance Criteria

1. THE Imprest_Fund_System SHALL mengambil daftar tahun yang tersedia (Available_Years) dari distinct years pada field createdAt dari seluruh data imprest fund
2. THE Imprest_Fund_System SHALL mengurutkan Available_Years secara descending (tahun terbaru di atas)
3. IF Available_Years kosong (tidak ada data imprest fund), THEN THE Imprest_Fund_System SHALL menampilkan tahun berjalan sebagai satu-satunya opsi
4. THE Imprest_Fund_System SHALL memperbarui Available_Years secara otomatis saat data imprest fund berubah (misalnya setelah penambahan data baru)
5. WHEN pengguna membuka year selector, THE Period_Filter_Component SHALL menampilkan seluruh Available_Years sebagai opsi yang dapat dipilih
