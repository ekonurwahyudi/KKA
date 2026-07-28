# Implementation Plan: Regional Filter Imprest Fund

## Overview

This implementation plan breaks down the regional filter feature into discrete, executable coding tasks. The feature adds a filter card component that allows users to filter imprest fund data by regional checkboxes, which dynamically updates the "Belum Refund" summary card calculation and the displayed imprest fund records.

The implementation follows a phased approach: state management → UI components → filter logic → calculation updates → edge case handling → testing.

## Tasks

- [x] 1. Add regional filter state management
  - Add `selectedRegionalCodes` state (string array) to ImprestFundPage component
  - Initialize state as empty array
  - Add handler function `handleRegionalToggle` to add/remove regional codes from state
  - Add handler function `handleSelectAll` to select all active regional codes
  - Add handler function `handleClearAll` to clear all selections
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Create RegionalFilterCard UI component
  - [x] 2.1 Implement filter card structure and layout
    - Create Card component with CardHeader and CardContent
    - Add title "Filter Regional" and description "Pilih regional untuk memfilter data"
    - Position card between Summary Cards and Input Form sections
    - Use responsive grid layout for checkboxes (1 column mobile, 2 tablet, 3 desktop)
    - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.2, 9.3_

  - [x] 2.2 Add active filter badge indicator
    - Display badge showing count of selected regionals when selections exist
    - Show text format: "X regional dipilih"
    - Hide badge when no selections active
    - Position badge in CardHeader next to title
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.3 Implement action buttons (Select All / Clear All)
    - Add "Pilih Semua" button that calls handleSelectAll
    - Add "Hapus Semua" button that calls handleClearAll
    - Disable "Pilih Semua" when all regionals already selected
    - Disable "Hapus Semua" when no regionals selected
    - Use Button component with variant="outline" and size="sm"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 2.4 Render regional checkboxes with labels
    - Map over activeRegionals array to render Checkbox components
    - Use shadcn/ui Checkbox component for each regional
    - Set checkbox id as `regional-${regional.code}`
    - Display regional.name as label text
    - Bind checked state to selectedRegionalCodes.includes(regional.code)
    - Bind onCheckedChange to handleRegionalToggle handler
    - Add cursor-pointer class to labels for better UX
    - _Requirements: 1.1, 1.2, 1.5, 2.1_

  - [x] 2.5 Add empty state handling
    - Show "Tidak ada regional tersedia" message when activeRegionals is empty
    - Center the message with appropriate styling
    - _Requirements: 1.4_

- [x] 3. Implement filter logic with memoization
  - [x] 3.1 Create activeRegionals memoized value
    - Use useMemo to filter regionals where isActive === true
    - Sort filtered regionals alphabetically by name
    - Depend on regionals data from useRegionals hook
    - _Requirements: 1.1, 1.3, 8.4, 10.2_

  - [x] 3.2 Create filteredImprestFunds memoized value
    - Use useMemo to filter imprestFunds based on selectedRegionalCodes
    - When selectedRegionalCodes is empty, return all imprestFunds
    - When selectedRegionalCodes has values, filter by regionalCode match
    - Exclude imprestFunds with null/undefined regionalCode when filter active
    - Combine with existing activeTab filter logic
    - Combine with existing searchQuery filter logic
    - Depend on: imprestFunds, selectedRegionalCodes, activeTab, searchQuery
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 10.1, 10.2, 10.3_

  - [x] 3.3 Update history table to use filteredImprestFunds
    - Replace direct imprestFunds usage with filteredImprestFunds in DataTable
    - Ensure tab counts (draftCount, openCount, etc.) still use full imprestFunds
    - _Requirements: 3.5, 7.3_

- [x] 4. Update Belum Refund calculation
  - [x] 4.1 Create belumRefundTotal memoized value
    - Use useMemo to calculate total from filtered imprest funds
    - When selectedRegionalCodes is empty, calculate from all imprest funds
    - When selectedRegionalCodes has values, filter by regionalCode first
    - Filter for status === 'open' OR status === 'proses'
    - Sum totalAmount field using reduce
    - Depend on: imprestFunds, selectedRegionalCodes
    - _Requirements: 4.1, 4.2, 4.5, 7.4, 7.5, 10.2, 10.4_

  - [x] 4.2 Update Summary Card to use belumRefundTotal
    - Replace inline calculation with belumRefundTotal variable
    - Keep existing formatting: toLocaleString('id-ID')
    - Ensure real-time updates when filter changes
    - _Requirements: 4.3, 4.4_

- [x] 5. Add edge case handling and cleanup
  - [x] 5.1 Add useEffect for inactive regional cleanup
    - Create useEffect that depends on activeRegionals
    - Extract active regional codes from activeRegionals
    - Filter selectedRegionalCodes to remove codes not in active list
    - Update selectedRegionalCodes state with cleaned array
    - _Requirements: 8.2, 8.3, 8.5_

  - [x] 5.2 Add accessibility attributes
    - Add aria-label to each Checkbox: `Filter by ${regional.name}`
    - Ensure keyboard navigation works (Tab, Space, Enter)
    - Verify focus indicators are visible on interactive elements
    - _Requirements: 9.4, 9.5_

  - [x] 5.3 Verify responsive layout implementation
    - Test grid layout on mobile (1 column)
    - Test grid layout on tablet (2 columns)
    - Test grid layout on desktop (3 columns)
    - Verify action buttons layout on mobile vs desktop
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Manual testing and refinement
  - [x] 7.1 Test filter interactions
    - Verify checkbox toggle adds/removes regional codes
    - Verify "Pilih Semua" selects all active regionals
    - Verify "Hapus Semua" clears all selections
    - Verify badge shows correct count
    - Verify badge hides when no selections
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.5, 6.3, 6.4, 6.5, 6.6_

  - [x] 7.2 Test filter logic
    - Verify no filter shows all imprest funds
    - Verify single regional filter shows only matching records
    - Verify multiple regional filter shows records matching any selected regional
    - Verify imprest funds with null regionalCode are excluded when filter active
    - Verify filter works with tab navigation (All, Draft, Open, Proses, Close)
    - Verify filter works with search query
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3_

  - [x] 7.3 Test Belum Refund calculation
    - Verify calculation without filter uses all open/proses imprest funds
    - Verify calculation with filter uses only filtered open/proses imprest funds
    - Verify calculation updates in real-time when filter changes
    - Verify calculation updates when switching tabs
    - _Requirements: 4.1, 4.2, 4.4, 7.4, 7.5_

  - [x] 7.4 Test edge cases
    - Verify behavior when no active regionals exist
    - Verify behavior when regional becomes inactive while selected
    - Verify behavior when all imprest funds have null regionalCode
    - Verify filter state persists when switching tabs
    - Verify filter state persists when searching
    - _Requirements: 1.4, 7.1, 7.3, 8.2, 8.3_

  - [x] 7.5 Test responsive design and accessibility
    - Test on mobile device (< 640px)
    - Test on tablet device (640px - 1024px)
    - Test on desktop device (> 1024px)
    - Test keyboard navigation (Tab, Space, Enter)
    - Test with screen reader if available
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 7.6 Performance testing
    - Measure filter operation time with 100+ imprest funds
    - Measure calculation time with 100+ imprest funds
    - Verify no memory leaks during repeated filter operations
    - Verify smooth UI updates (no lag or jank)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks reference specific requirements for traceability
- Implementation uses TypeScript with React and Next.js App Router
- Uses existing shadcn/ui components (Card, Checkbox, Button, Badge)
- Uses existing hooks: useRegionals() and useImprestFunds()
- Filter logic uses React hooks: useState, useMemo, useEffect
- No database schema changes required
- No API changes required
- Feature is purely frontend implementation
- Checkpoints ensure incremental validation
- Manual testing tasks verify all acceptance criteria
- Performance requirements: filter < 100ms, calculation < 50ms for 1000 records
