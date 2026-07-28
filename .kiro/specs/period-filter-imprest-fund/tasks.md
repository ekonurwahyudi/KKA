# Implementation Plan: Period Filter Imprest Fund

## Overview

Implementasi fitur Period Filter pada halaman Imprest Fund yang memungkinkan pengguna memfilter data berdasarkan tahun (year) dan periode waktu (Quartal atau Bulan). Fitur ini menggunakan Popover pattern yang konsisten dengan filter regional yang sudah ada, bekerja bersamaan (AND logic) dengan filter regional, dan memperbarui tabel serta summary card "Belum Refund" secara real-time.

Implementasi dilakukan secara bertahap: constants → state management → handler functions → filter logic → availableYears → UI component → integrasi filter → testing.

## Tasks

- [x] 1. Tambahkan constants dan type definitions untuk period filter
  - Tambahkan `quarterOptions` array: `['Q1', 'Q2', 'Q3', 'Q4']`
  - Tambahkan `monthOptions` array: `['Januari', 'Februari', ..., 'Desember']`
  - Tambahkan `quarterMonthRanges` mapping: `{ 'Q1': [0, 2], 'Q2': [3, 5], 'Q3': [6, 8], 'Q4': [9, 11] }`
  - Tambahkan `monthIndexMap` mapping: `{ 'Januari': 0, 'Februari': 1, ..., 'Desember': 11 }`
  - Definisikan di dalam file `src/app/dashboard/imprest-fund/page.tsx` sebelum komponen
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2_

- [x] 2. Tambahkan state management untuk period filter
  - Tambahkan state `filterMode` dengan tipe `'quartal' | 'bulan'`, default `'quartal'`
  - Tambahkan state `selectedPeriod` dengan tipe `string`, default `''`
  - Tambahkan state `selectedYear` dengan tipe `number`, default `new Date().getFullYear()`
  - Tempatkan state di dalam komponen `ImprestFundPage`, berdekatan dengan state `selectedRegionalCodes`
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 8.1_

- [x] 3. Buat handler functions untuk period filter
  - Buat function `handleFilterModeChange` yang menerima parameter `newMode: 'quartal' | 'bulan'`, set `filterMode` ke `newMode` dan reset `selectedPeriod` ke `''`
  - Buat function `handleResetPeriod` yang set `selectedPeriod` ke `''`
  - _Requirements: 2.4, 6.4_

- [x] 4. Buat helper function `filterByPeriod`
  - Buat function `filterByPeriod` yang menerima parameter `imprest: ImprestFund` dan return `boolean`
  - Parse `createdAt` ke Date object, guard terhadap invalid date (return `false` jika `isNaN`)
  - **Selalu filter berdasarkan `selectedYear`**: cek apakah tahun `createdAt` sama dengan `selectedYear`, return `false` jika berbeda (year filter selalu aktif sebagai base filter)
  - Jika `selectedPeriod` kosong, return `true` (year filter sudah cukup)
  - Jika `filterMode === 'quartal'`: gunakan `quarterMonthRanges` untuk cek apakah bulan `createdAt` dalam range
  - Jika `filterMode === 'bulan'`: gunakan `monthIndexMap` untuk cek apakah bulan `createdAt` sama dengan target
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 9.3_

- [x] 5. Update `filteredImprestFunds` useMemo untuk include period filter
  - Tambahkan `filtered = filtered.filter(filterByPeriod)` setelah regional filter dan sebelum tab filter
  - Tambahkan `selectedYear`, `filterMode`, dan `selectedPeriod` ke dependency array useMemo
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.4, 7.1, 7.2, 8.2_

- [x] 6. Update `belumRefundTotal` useMemo untuk include period filter
  - Tambahkan `fundsToCalculate = fundsToCalculate.filter(filterByPeriod)` setelah regional filter
  - Tambahkan `selectedYear`, `filterMode`, dan `selectedPeriod` ke dependency array useMemo
  - _Requirements: 5.1, 5.2, 5.4, 5.5, 7.3_

- [x] 7. Buat `availableYears` memoized value
  - Buat `useMemo` yang mengekstrak distinct years dari `imprestFunds.map(i => new Date(i.createdAt).getFullYear())`
  - Gunakan `[...new Set(years)]` untuk mendapatkan distinct values
  - Sort descending: `.sort((a, b) => b - a)`
  - Jika hasilnya kosong (tidak ada data), fallback ke `[new Date().getFullYear()]`
  - Dependency array: `[imprestFunds]`
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 8. Checkpoint - Pastikan logic filter dan availableYears berjalan tanpa error
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Buat UI komponen Period Filter Popover
  - [x] 9.1 Tambahkan import `Calendar` icon dari lucide-react (jika belum ada)
    - Pastikan import `Popover`, `PopoverContent`, `PopoverTrigger` sudah ada
    - Pastikan import `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` sudah ada
    - Pastikan import `Badge` sudah ada
    - Pastikan import `Label` sudah ada
    - _Requirements: 1.5, 1.6_

  - [x] 9.2 Buat Popover trigger button
    - Gunakan `Button` variant="outline" size="sm" dengan className="gap-2"
    - Tampilkan icon `Calendar` (h-4 w-4)
    - Tampilkan teks: jika `selectedPeriod` ada, tampilkan `${selectedPeriod} ${selectedYear}` (contoh: "Q1 2026" atau "Januari 2026"); jika kosong, tampilkan `${selectedYear}` (contoh: "2026")
    - Tampilkan `Badge` dengan angka "1" jika `selectedPeriod` memiliki nilai
    - _Requirements: 1.6, 6.1, 6.2, 6.3_

  - [x] 9.3 Buat Popover content dengan year select, mode select, dan period select
    - Buat `PopoverContent` dengan className="w-72"
    - Tambahkan header "Filter Periode" dengan badge indikator periode aktif (menampilkan `${selectedPeriod} ${selectedYear}`)
    - **Year Select (di atas mode selector)**: Tambahkan `Select` untuk tahun dengan options dari `availableYears`, value=`selectedYear.toString()`, onValueChange set `selectedYear` ke `Number(val)`, dengan Label "Tahun" dan aria-label "Pilih tahun"
    - **Mode Select**: Tambahkan `Select` untuk mode filter (Quartal/Bulan) dengan `onValueChange={handleFilterModeChange}`, dengan Label "Mode Filter" dan aria-label "Pilih mode filter"
    - **Period Select**: Tambahkan `Select` untuk pilihan periode dengan options berdasarkan `filterMode` (quarterOptions atau monthOptions), dengan Label "Pilih Periode" dan aria-label "Pilih periode"
    - Tambahkan tombol "Reset Periode" yang memanggil `handleResetPeriod`, disabled jika `!selectedPeriod`
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 6.4, 6.5, 10.5, 11.5_

  - [x] 9.4 Tempatkan Period Filter Popover di filter bar
    - Posisikan sejajar dengan Regional Filter Popover yang sudah ada
    - Gunakan layout flex dengan gap yang konsisten
    - Pastikan responsive: stacked pada mobile, inline pada desktop
    - _Requirements: 1.5, 10.1, 10.2, 10.3, 10.4_

- [x] 10. Checkpoint - Pastikan UI dan filter terintegrasi dengan benar
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 11. Tulis property-based tests untuk period filter logic
  - [ ]* 11.1 Write property test: Quarter filter includes only items within the quarter's month range on the selected year
    - **Property 1: Quarter filter includes only items within the quarter's month range on the selected year**
    - Generate random imprest fund dengan berbagai `createdAt` dates (across multiple years)
    - Generate random quarter value (Q1-Q4) dan random year
    - Assert: item included jika dan hanya jika bulan `createdAt` dalam range quarter DAN tahun `createdAt` = selectedYear
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 11.2 Write property test: Month filter includes only items matching the selected month on the selected year
    - **Property 2: Month filter includes only items matching the selected month on the selected year**
    - Generate random imprest fund dengan berbagai `createdAt` dates (across multiple years)
    - Generate random month name (Januari-Desember) dan random year
    - Assert: item included jika dan hanya jika bulan `createdAt` = index bulan yang dipilih DAN tahun `createdAt` = selectedYear
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 11.3 Write property test: Empty period with selected year filters by year only
    - **Property 3: Empty period with selected year filters by year only**
    - Generate random imprest fund dengan berbagai `createdAt` dates (across multiple years)
    - Generate random year
    - Assert: item included jika dan hanya jika tahun `createdAt` = selectedYear
    - **Validates: Requirements 3.5, 4.3**

  - [ ]* 11.4 Write property test: Changing filter mode resets selected period
    - **Property 4: Changing filter mode resets selected period**
    - Generate random filterMode dan selectedPeriod
    - Simulasikan perubahan mode
    - Assert: selectedPeriod menjadi empty string setelah mode berubah
    - **Validates: Requirements 2.4**

  - [ ]* 11.5 Write property test: Combined filters apply AND logic
    - **Property 5: Combined filters apply AND logic**
    - Generate random list imprest funds, random regional codes, random year, random period
    - Apply combined filter
    - Assert: hasil = items yang pass regional filter DAN period filter (year + period)
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 11.6 Write property test: Belum Refund total equals sum of filtered open/proses items
    - **Property 6: Belum Refund total equals sum of filtered open/proses items**
    - Generate random list imprest funds dengan berbagai status, totalAmount, dan createdAt (across multiple years)
    - Apply combined filter (regional + year + period)
    - Assert: belumRefundTotal = sum totalAmount dari items yang pass filter DAN status 'open'/'proses'
    - **Validates: Requirements 5.1, 5.5, 7.3**

  - [ ]* 11.7 Write property test: Available years are distinct years from data sorted descending
    - **Property 7: Available years are distinct years from data sorted descending**
    - Generate random list imprest funds dengan berbagai `createdAt` dates
    - Assert: availableYears = distinct years sorted descending; jika list kosong, return [current year]
    - **Validates: Requirements 11.1, 11.2, 11.3**

  - [ ]* 11.8 Write property test: Popover trigger text includes period and year
    - **Property 8: Popover trigger text includes period and year**
    - Generate random selectedPeriod dan selectedYear
    - Assert: jika selectedPeriod non-empty, text = `${selectedPeriod} ${selectedYear}`; jika empty, text = `${selectedYear}`
    - **Validates: Requirements 6.2, 6.3**

- [ ]* 12. Tulis unit tests untuk period filter
  - [ ]* 12.1 Test rendering komponen Period Filter Popover
    - Verify Popover trigger menampilkan tahun berjalan saat default (bukan "Semua Periode")
    - Verify year selector menampilkan available years
    - Verify mode select menampilkan opsi "Quartal" dan "Bulan"
    - Verify quarter options (Q1-Q4) ditampilkan saat mode quartal
    - Verify month options (Januari-Desember) ditampilkan saat mode bulan
    - _Requirements: 1.1, 1.2, 1.3, 11.5_

  - [ ]* 12.2 Test state management dan handler functions
    - Verify `handleFilterModeChange` mengubah mode dan reset period
    - Verify `handleResetPeriod` mengosongkan selectedPeriod
    - Verify year selector mengubah selectedYear
    - Verify badge muncul saat filter aktif
    - Verify badge hilang saat filter tidak aktif
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 6.1, 6.4_

  - [ ]* 12.3 Test integrasi filter periode dengan filter regional
    - Verify kedua filter bekerja bersamaan (AND logic)
    - Verify reset satu filter tidak mempengaruhi filter lainnya
    - Verify belumRefundTotal dihitung berdasarkan kedua filter (regional + year + period)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 12.4 Test filter persistence saat navigasi tab
    - Verify filter state (termasuk selectedYear) tetap saat berpindah tab
    - Verify filter diterapkan pada setiap tab
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 12.5 Test availableYears computation
    - Verify distinct years diambil dari data
    - Verify sorted descending
    - Verify fallback ke tahun berjalan jika data kosong
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 13. Final checkpoint - Pastikan semua implementasi lengkap dan berfungsi
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Semua implementasi dilakukan di file `src/app/dashboard/imprest-fund/page.tsx`
- Fitur ini murni frontend, tidak ada perubahan API atau database
- Menggunakan komponen shadcn/ui yang sudah tersedia (Popover, Select, Button, Badge, Label)
- Menggunakan React hooks: useState, useMemo
- Filter periode bekerja bersamaan dengan filter regional menggunakan AND logic
- `selectedYear` selalu aktif sebagai base filter (year filter never off)
- Filter state dipertahankan saat navigasi antar tab
- Target performa: filter < 100ms untuk dataset hingga 1000 records
- Property tests menggunakan library fast-check
- Setiap task references specific requirements untuk traceability
