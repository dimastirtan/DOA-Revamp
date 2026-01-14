# DOA Document Storage Logic

This document describes the filesystem structure and storage logic for 
documents in the DOA system, based on an analysis of the database 
content (`standard.sql`) and system routes.

## Base Directory
The root for all documents is the `WES/` directory.

## Document Type Mappings

### 1. Aircraft Documents (`WES/DOA/`)
Most aircraft-related documents are stored under the `WES/DOA/` hierarchy.

| Type | Description | Folder Path |
| :--- | :--- | :--- |
| `cer` | Certificates | `WES/DOA/Certificate/` |
| `cmd` | Command Media | `WES/DOA/Command Media/` |
| `man` | Manuals | `WES/DOA/` |
| `pro` | Procedures | `WES/DOA/` |
| `wi` | Work Instructions | `WES/DOA/` |
| `doc` | Technical Documents | `WES/DOA/Document/` |
| `AWO` | Personnel Assignment | `WES/DOA/Personnel Assignment/AWO/` |
| `CVE` | Personnel Assignment | `WES/DOA/Personnel Assignment/CVE/` |

### 2. Engineering Standards (Part 41 Series)
Engineering standards are primarily stored under the `WES/PART41/` hierarchy.

| Type | Description | Folder Path |
| :--- | :--- | :--- |
| `41A` | Material Standards | `WES/PART41/A/` |
| `41B` | Design Standards | `WES/PART41/B/` |
| `41C-1` | Marking & Labeling | `WES/PART41/C_MARKLABEL/` |
| `41C-2` | Part Standards | `WES/PART41/C_PART/` (var: `C-Part`, `C_Part`) |
| `41C-3` | Profile Standards | `WES/PART41/C_PROFILE/` |
| `41D` | Standard Parts | `WES/PART41/D/` |
| `41E` | Material & Process (E) | `WES/PART41/E/` |
| `41F` | Material & Process (F) | `WES/PART41/F/` |
| `41G` | Material & Process (G) | `WES/PART41/G/` |
| `41H` | Material & Process (H) | `WES/PART41/H/` |
| `41I` | Material & Process (I) | `WES/PART41/I/` |
| `41N` | Strategic/Special Product | `WES/PART41/N/` |
| `mtm` | Material Test Methods | `WES/PART41/MTM/` |

### 3. Non-Aircraft Documents (`WES/NON AIRCRAFT/`)
Documents related to non-aircraft programs or strategic/special products.

| Type | Description | Folder Path |
| :--- | :--- | :--- |
| `cer2` | Non-Aircraft Certificates | `WES/NON AIRCRAFT/Certificate/` |
| `cp` | Certification Procedure | `WES/NON AIRCRAFT/Certification Procedure/` |
| `doc2` | Non-Aircraft Documents | `WES/NON AIRCRAFT/Document/` |
| `man2` | Non-Aircraft Manuals | `WES/NON AIRCRAFT/Manual/` |
| `pro2` | Non-Aircraft Procedures | `WES/NON AIRCRAFT/Procedure/` |
| `tm` | Test Methods | `WES/NON AIRCRAFT/Test Method/` |
| `wi2` | Non-Aircraft Work Instructions | `WES/NON AIRCRAFT/Work Instruction/` |

### 4. Libraries and Quality Plans
External standards and quality/arrangement documents.

| Type | Description | Folder Path |
| :--- | :--- | :--- |
| `lib` | External Libraries | `WES/LIBRARY/[SUBTYPE]/` |
| `standard`| Internal Forms/Standards | `WES/FORM/[SUBTYPE]/` |
| `form2` | Non-Aircraft Forms | `WES/FORM/Form NA/` |
| `WA` | Working Arrangements | (Often empty/placeholder paths) |
| `QP1` | Quality Plans (A/C) | (Often empty/placeholder paths) |
| `QP2` | Quality Plans (Non-A/C)| (Often empty/placeholder paths) |

## Path Construction Notes
- **Empty Paths:** Many records for `WA` (Working Arrangement) and `QP` (Quality Plan) types currently have empty `nmpath` values in the database.
- **Library Subtypes:** Type `lib` includes subfolders such as `ANSI`, `RTCA`, `SAE`, `AIA-NAS`, `ISO`, and `MILSTD`.
- **Form Subtypes:** Type `standard` includes subfolders such as `PDF`, `Office`, and `Word`.
