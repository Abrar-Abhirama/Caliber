---
record_type: "data_quality_findings"
title: "Data quality findings in the source dataset"
kb_generated: "2026-09-27"
---

# Data quality findings

Problems found while building this knowledge base. The hub should show these to the user, not hide them.

| # | Finding | Where | Why it matters |
|---|---|---|---|
| DQ-01 | Pumping temperature conflict: OPL hazard note says 16 barg / 80 degC, datasheet says 40 degC pumping temp | [OPL-GA-1201A-01](../documents/GA-1201A/OPL-GA-1201A-01.md) (same line in 02 and 03), [TJC-LLD-DS-GA-1201A](../documents/GA-1201A/TJC-LLD-DS-GA-1201A.md) | Two sources disagree. The approved datasheet wins; the answer should flag the conflict |
| DQ-02 | Packing grade mismatch: datasheet says PTFE Piller 4526L, WO-240029 records PTFE 4505L renewed at the feed end | [TJC-LLD-DS-YD-2301](../documents/YD-2301/TJC-LLD-DS-YD-2301.md), [WO-240029](../work-orders/YD-2301/WO-240029.md) | Wrong spare may have been fitted, or the datasheet is out of date |
| DQ-03 | 26 work orders are missing downtime or cost | `missing_fields` in each WO front matter | Cost and downtime totals are understated |
| DQ-04 | P&ID title blocks read TJC-LLD-PID-XXXX (placeholder number) | all `TJC-LLD-PID-*` files | Drawing numbers here are inferred from the unit number |
| DQ-05 | GA-1201A OPL-04 and OPL-06 were missing (resolved 2026-10-03) | `documents/GA-1201A/` | Added from the supplied PDFs; all 8 assets now have 7 OPLs. No page image yet in `images/`, and their common-problems cells were cut off in the PDF, so the full text was restored from WO-240002/3/4 as in the other GA-1201A OPLs |
| DQ-06 | OPL acceptance column is misaligned with steps (e.g. OPL-GA-1201A-03 step 4 "Target angular <0.05" paired with "No leak / smooth operation") | OPL procedure tables | Do not quote the acceptance column as the criterion for a step without checking |
| DQ-07 | Drawings (GA, plot plan, P&ID) are Rev 0 IFC | drawing files | Not as-built; confirm in the field |
| DQ-08 | Hot alignment check required by OPL-GA-1201A-05 is never recorded in any WO | [OPL-GA-1201A-05](../documents/GA-1201A/OPL-GA-1201A-05.md) | Procedure not followed, or not logged |
