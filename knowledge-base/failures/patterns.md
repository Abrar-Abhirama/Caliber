---
record_type: "failure_patterns"
title: "Failure memory: repeat failure chains and plant-wide patterns"
source: "Derived from corrective work orders (root cause field). Every claim links the WO it came from."
kb_generated: "2026-09-27"
---

# Failure memory

Patterns found by grouping the root-cause field of corrective work orders. This file is derived, not an approved document. Treat it as a lead and check the linked WOs.

## GA-1201A misalignment chain (hero scenario)

One root cause produced four work orders.

| Order | WO | What happened | Root cause |
|---|---|---|---|
| 1 | [WO-240003](../work-orders/GA-1201A/WO-240003.md) | Tripped on VSHH-1201 at 7.4 mm/s | Angular misalignment 0.12 mm/100 mm after foundation settlement |
| 2 | [WO-240013](../work-orders/GA-1201A/WO-240013.md) | Hairline crack in epoxy grout under baseplate | Vibration-induced grout fatigue at pump end |
| 3 | [WO-240004](../work-orders/GA-1201A/WO-240004.md) | DE bearing noisy, TI-1201 rising | Outer race spalling from prolonged misalignment |
| 4 | [WO-240007](../work-orders/GA-1201A/WO-240007.md) | Coupling noise, guard vibration | Rexnord coupling element cracked from repeated misalignment cycles |

- Alignment targets: angular < 0.05 mm/100 mm, offset < 0.05 mm ([OPL-GA-1201A-03](../documents/GA-1201A/OPL-GA-1201A-03.md)).
- A hot alignment check about 2 h after start-up is required by [OPL-GA-1201A-05](../documents/GA-1201A/OPL-GA-1201A-05.md). No WO records one; the only "hot" matches in the WO history are thermography "hotspot" findings.
- Vibration alarm 4.5 mm/s ([OPL-GA-1201A-07](../documents/GA-1201A/OPL-GA-1201A-07.md)); trip VSHH-1201 > 7.1 mm/s RMS, 1oo2 ([TJC-LLD-IL-GA-1201A](../documents/GA-1201A/TJC-LLD-IL-GA-1201A.md)).
- Lesson: after a vibration trip, check the grout and foundation, not only the alignment, and log the hot check.

## Plant-wide patterns

### Impulse lines and bridles plugged by fines or polymer
Seen on 4 assets. Symptom is an erratic dP, level or pressure reading and nuisance alarms.
- [WO-240008](../work-orders/GA-1201A/WO-240008.md) GA-1201A, PDI-1201 impulse lines fouled with hexane residue and polymer fines
- [WO-240115](../work-orders/EA-5601/WO-240115.md) EA-5601, tube dP impulse lines plugged with fines
- [WO-240193](../work-orders/FA-8901/WO-240193.md) FA-8901, level bridle legs plugged with fines
- [WO-240196](../work-orders/FA-8901/WO-240196.md) FA-8901, drum pressure impulse line plugged
- Related: [WO-240033](../work-orders/YD-2301/WO-240033.md) YD-2301, FT-2302 flow element fouled with powder carryover

### Spiral-wound gaskets unevenly seated or relaxed
Seen on 4 assets, usually found at a leak test after maintenance.
- [WO-240062](../work-orders/DC-3401A/WO-240062.md) DC-3401A bottom manway
- [WO-240111](../work-orders/EA-5601/WO-240111.md) EA-5601 channel flange
- [WO-240145](../work-orders/LV-6701/WO-240145.md) LV-6701 body/bonnet joint
- [WO-240195](../work-orders/FA-8901/WO-240195.md) FA-8901 manway after inspection

### Control loops poorly tuned after a change
Hunting or overshoot right after a repair, re-range or calibration.
- [WO-240009](../work-orders/GA-1201A/WO-240009.md) GA-1201A, FIC-1201 after transmitter re-range
- [WO-240064](../work-orders/DC-3401A/WO-240064.md) DC-3401A, heater outlet after heater repair
- [WO-240114](../work-orders/EA-5601/WO-240114.md) EA-5601, TV-5602 loop
- [WO-240191](../work-orders/FA-8901/WO-240191.md) FA-8901, split-range calibration overlap

### Analyzer and sensor cells at end of life
- [WO-240039](../work-orders/YD-2301/WO-240039.md) YD-2301, O2 sensor cell (inerting confidence)
- [WO-240063](../work-orders/DC-3401A/WO-240063.md) DC-3401A, H2 analyzer cell
- [WO-240168](../work-orders/CT-7801/WO-240168.md) CT-7801, conductivity cell scaled

### Packing and seal wear
- [WO-240028](../work-orders/YD-2301/WO-240028.md), [WO-240029](../work-orders/YD-2301/WO-240029.md) YD-2301 gland packing
- [WO-240032](../work-orders/YD-2301/WO-240032.md) YD-2301 rotary joint carbon seal
- [WO-240094](../work-orders/KC-4501/WO-240094.md) KC-4501 PTFE pressure packing
- [WO-240135](../work-orders/LV-6701/WO-240135.md), [WO-240138](../work-orders/LV-6701/WO-240138.md) LV-6701 stem packing
- [WO-240002](../work-orders/GA-1201A/WO-240002.md) GA-1201A mechanical seal ran dry (Plan 11 orifice plugged)

### Rotating equipment wear
- [WO-240163](../work-orders/CT-7801/WO-240163.md) CT-7801 blade erosion imbalance; [WO-240166](../work-orders/CT-7801/WO-240166.md) fan bearing; [WO-240169](../work-orders/CT-7801/WO-240169.md) drive-shaft coupling
- [WO-240088](../work-orders/KC-4501/WO-240088.md) KC-4501 crosshead pin clearance; [WO-240091](../work-orders/KC-4501/WO-240091.md) main bearing oil groove; [WO-240084](../work-orders/KC-4501/WO-240084.md) lube pump gears worn
- [WO-240034](../work-orders/YD-2301/WO-240034.md) YD-2301 trunnion roller bearing; [WO-240031](../work-orders/YD-2301/WO-240031.md) chain elongation

### Heat-transfer fouling
- [WO-240110](../work-orders/EA-5601/WO-240110.md) EA-5601 tube-bore fouling
- [WO-240089](../work-orders/KC-4501/WO-240089.md) KC-4501 intercooler waterside
- [WO-240164](../work-orders/CT-7801/WO-240164.md) CT-7801 gearbox oil cooler; [WO-240171](../work-orders/CT-7801/WO-240171.md) fill collapsed
