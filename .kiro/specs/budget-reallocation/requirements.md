# Requirements Document

## Introduction

Fitur Relokasi Anggaran (RRA) memungkinkan pengguna untuk melakukan pemindahan anggaran dari satu GL Account ke GL Account lain dalam tahun anggaran yang sama. Fitur ini mencakup pencatatan transaksi relokasi, pembaruan otomatis saldo anggaran pada kedua GL Account (sumber dan tujuan), serta riwayat audit untuk transparansi dan akuntabilitas.

## Glossary

- **System**: Aplikasi budget management (digiran-app)
- **Reallocation_Service**: Modul backend yang memproses logika relokasi anggaran
- **Budget_Page**: Halaman UI untuk manajemen anggaran (`/dashboard/budget`)
- **GL_Account**: General Ledger Account, akun pembukuan yang memiliki alokasi anggaran
- **Source_Budget**: Anggaran GL Account yang menjadi sumber dana relokasi
- **Destination_Budget**: Anggaran GL Account yang menjadi tujuan penerimaan dana relokasi
- **Reallocation_Record**: Catatan transaksi relokasi yang menyimpan detail pemindahan anggaran
- **Quarter**: Periode kuartal (Q1-Q4) yang terkait dengan alokasi anggaran

## Requirements

### Requirement 1: Create Reallocation Record

**User Story:** As a budget manager, I want to create a reallocation record to transfer budget from one GL Account to another, so that I can redistribute funds based on operational needs.

#### Acceptance Criteria

1. WHEN the user submits a reallocation form, THE Reallocation_Service SHALL create a Reallocation_Record containing: date, source GL Account, destination GL Account, amount, affected quarter, and reason/notes
2. WHEN the user submits a reallocation form, THE System SHALL validate that the source GL Account has sufficient budget in the specified quarter to cover the reallocation amount
3. IF the source GL Account has insufficient budget for the specified quarter, THEN THE System SHALL display an error message indicating the available balance
4. WHEN the user opens the reallocation form, THE System SHALL display a dropdown of available GL Accounts for both source and destination selection
5. THE System SHALL prevent the user from selecting the same GL Account as both source and destination
6. WHEN the user selects a source GL Account and quarter, THE System SHALL display the current available budget for that quarter

### Requirement 2: Update Budget Amounts After Reallocation

**User Story:** As a budget manager, I want the budget amounts to be automatically updated after a reallocation, so that the budget records always reflect the current state.

#### Acceptance Criteria

1. WHEN a Reallocation_Record is successfully created, THE Reallocation_Service SHALL deduct the reallocation amount from the Source_Budget quarterly amount for the specified quarter
2. WHEN a Reallocation_Record is successfully created, THE Reallocation_Service SHALL add the reallocation amount to the Destination_Budget quarterly amount for the specified quarter
3. WHEN a Reallocation_Record is successfully created, THE Reallocation_Service SHALL recalculate and update the monthly amounts for both Source_Budget and Destination_Budget proportionally within the affected quarter
4. WHEN a Reallocation_Record is successfully created, THE Reallocation_Service SHALL update the totalAmount field of both Source_Budget and Destination_Budget to reflect the new sum of all quarterly amounts
5. THE Reallocation_Service SHALL execute the deduction from Source_Budget and addition to Destination_Budget within a single database transaction to ensure data consistency

### Requirement 3: View Reallocation History

**User Story:** As a budget manager, I want to view the complete history of all reallocation transactions, so that I can track budget movements for audit purposes.

#### Acceptance Criteria

1. THE System SHALL display a list of all Reallocation_Records for the selected year, ordered by date descending
2. WHEN the user views the reallocation history, THE System SHALL show for each record: date, source GL Account code and description, destination GL Account code and description, amount, affected quarter, and reason/notes
3. WHEN the user filters by year, THE System SHALL display only Reallocation_Records for that year
4. THE System SHALL format all monetary values using Indonesian locale (id-ID) with thousand separators

### Requirement 4: Access Reallocation Feature from Budget Page

**User Story:** As a budget manager, I want to access the reallocation feature directly from the budget page, so that I can perform reallocations within the same workflow.

#### Acceptance Criteria

1. THE Budget_Page SHALL display a button or tab to access the reallocation feature
2. WHEN the user clicks the reallocation access point, THE System SHALL display the reallocation form and history in a dialog or dedicated section
3. THE System SHALL pre-select the current year filter to match the year selected on the Budget_Page

### Requirement 5: Reallocation Data Persistence

**User Story:** As a budget manager, I want reallocation records to be permanently stored, so that I have a complete audit trail.

#### Acceptance Criteria

1. THE System SHALL persist each Reallocation_Record with the following fields: unique identifier, creation timestamp, source GL Account ID, destination GL Account ID, amount, affected quarter, year, and reason/notes
2. THE System SHALL associate each Reallocation_Record with the corresponding year for filtering purposes
3. WHEN a Reallocation_Record is created, THE System SHALL record the creation timestamp automatically
