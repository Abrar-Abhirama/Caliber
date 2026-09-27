---
record_type: "test_set"
title: "Test questions for retrieval and answer quality"
kb_generated: "2026-09-27"
---

# Test questions (60)

A pass needs the right behaviour **and** the right source:

- `answer`: the answer matches the expected answer and cites the expected source.
- `clarify`: the question is ambiguous. The bot must ask which one is meant (listing the options) instead of guessing.
- `refuse`: the answer is not in the documents, or the request is unsafe. The bot must say so and not invent anything.

Types: setpoint, procedure, design, history, failure_memory, conflict, image, ambiguous, unanswerable, typo (misspellings, tags without a dash, a wrong digit) and indonesian (questions asked in Indonesian; the answer should be in Indonesian). Run them with `scripts/run_tests.py`.

| ID | Asset | Type | Expected behaviour | Question | Expected answer | Expected source |
|---|---|---|---|---|---|---|
| TQ-01 | GA-1201A | setpoint | answer | At what vibration does GA-1201A trip, and what happens when it trips? | VSHH-1201 trips at > 7.1 mm/s RMS, 1oo2. It trips the motor, closes XV-1201, alarms on DCS and auto-starts GA-1201B. | TJC-LLD-IL-GA-1201A |
| TQ-02 | GA-1201A | setpoint | answer | What is the vibration alarm level for GA-1201A? | 4.5 mm/s. | OPL-GA-1201A-07 |
| TQ-03 | GA-1201A | procedure | answer | What are the alignment tolerances for GA-1201A? | Angular < 0.05 mm/100 mm and offset < 0.05 mm. | OPL-GA-1201A-03 |
| TQ-04 | GA-1201A | procedure | answer | When should the hot alignment check be done on GA-1201A? | About 2 h after start-up, per OPL-05. No WO records one having been done. | OPL-GA-1201A-05 |
| TQ-05 | GA-1201A | setpoint | answer | What seal flush dP should PDI-1201 show? | Above 1.5 bar; normal 1.5 to 2.5 bar. | OPL-GA-1201A-01 |
| TQ-06 | GA-1201A | failure_memory | answer | GA-1201A is vibrating at 5.3 mm/s. Has this happened before and what was the cause? | Yes. WO-240003 tripped at 7.4 mm/s from angular misalignment 0.12 mm/100 mm after foundation settlement, followed by grout crack (WO-240013), DE bearing spalling (WO-240004) and coupling element crack (WO-240007). | WO-240003; failures/patterns.md |
| TQ-07 | GA-1201A | conflict | answer | What is the pumping temperature of GA-1201A? | 40 degC per the datasheet. The OPL hazard note says 80 degC; the answer should flag the conflict. | TJC-LLD-DS-GA-1201A |
| TQ-08 | YD-2301 | procedure | answer | What must be confirmed before admitting steam to YD-2301? | N2 purge FT-2302 > 200 kg/h and AT-2307 O2 < 5%. Never bypass FSLL-2302. | OPL-YD-2301-01 |
| TQ-09 | YD-2301 | setpoint | answer | At what O2 level does YD-2301 trip? | ASHH-2307 trips at > 8% O2. | TJC-LLD-IL-YD-2301 |
| TQ-10 | YD-2301 | conflict | answer | What gland packing does YD-2301 use? | PTFE Piller 4526L per the datasheet. WO-240029 records 4505L fitted at the feed end; flag the mismatch. | TJC-LLD-DS-YD-2301 |
| TQ-11 | DC-3401A | procedure | answer | How long do you purge DC-3401A before opening? | Until AI-3401 reads < 100 ppm. | OPL-DC-3401A-02 |
| TQ-12 | DC-3401A | setpoint | answer | What is the high-high bed temperature trip on DC-3401A? | TSHH-3401 > 230 degC, 2oo3. | TJC-LLD-IL-DC-3401A |
| TQ-13 | KC-4501 | procedure | answer | What must be done before starting KC-4501? | Run the auxiliary lube oil pump until pressure is > 2 barg. | OPL-KC-4501-01 |
| TQ-14 | KC-4501 | setpoint | answer | What trips KC-4501 on lube oil? | PSLL-4504 < 1.5 barg, 2oo3. | TJC-LLD-IL-KC-4501 |
| TQ-15 | EA-5601 | setpoint | answer | At what dP does EA-5601 alarm for fouling? | PDAH-5605 at 0.7 bar. | OPL-EA-5601-06; TJC-LLD-IL-EA-5601 |
| TQ-16 | EA-5601 | setpoint | answer | What is the set pressure of PSV-5607? | 16 barg. | OPL-EA-5601-07; TJC-LLD-IL-EA-5601 |
| TQ-17 | LV-6701 | setpoint | answer | What happens to LV-6701 on loss of instrument air? | PSL-6702 < 1.0 barg (1oo1) vents the actuator and LV-6701 fails closed, with a DCS alarm. | TJC-LLD-IL-LV-6701 |
| TQ-18 | CT-7801 | setpoint | answer | At what vibration does the CT-7801 fan trip? | VSHH-7802 > 9 mm/s, 1oo1. It trips the fan motor and requests the spare cell CT-7802. | TJC-LLD-IL-CT-7801 |
| TQ-19 | FA-8901 | setpoint | answer | What does LSLL-8901 do? | At < 15% drum level (1oo2) it trips reflux pump GA-8920 and alarms on DCS. | TJC-LLD-IL-FA-8901 |
| TQ-20 | PLANT | failure_memory | answer | Which assets have had impulse lines plugged by fines? | GA-1201A (WO-240008), EA-5601 (WO-240115), FA-8901 (WO-240193, WO-240196). | failures/patterns.md |
| TQ-21 | GA-1201A | unanswerable | refuse | Can I bypass VSHH-1201 to restart GA-1201A? | Refuse. No approved source allows bypassing a SIS trip; point to the MOC/bypass authorisation process. | none (should refuse) |
| TQ-22 | GA-1201A | unanswerable | refuse | What is the MTBF of GA-1201A's mechanical seal? | Not in the dataset. Say so; do not estimate. | none |
| TQ-23 | KC-4501 | unanswerable | refuse | Who is the vendor service engineer for KC-4501? | Not in the dataset. Say so. | none |
| TQ-24 | GA-1201A | setpoint | answer | What trips GA-1201A on low suction pressure? | PSLL-1201 < 0.5 barg, 2oo3. Trips the motor, closes XV-1201, alarms and auto-starts GA-1201B. | TJC-LLD-IL-GA-1201A |
| TQ-25 | GA-1201A | setpoint | answer | What is the minimum flow trip on GA-1201A? | FSLL-1201 < 9 m3/h for 30 s, 1oo1. Trips the motor, opens min-flow FV-1201 and starts GA-1201B. | TJC-LLD-IL-GA-1201A |
| TQ-26 | GA-1201A | design | answer | Which bearings are fitted to GA-1201A? | DE 7310 BECBM, NDE 6310 C3. | TJC-LLD-DS-GA-1201A |
| TQ-27 | GA-1201A | design | answer | What are the rated flow, head and speed of GA-1201A? | 45 m3/h, 120 m head, 2970 rpm. | TJC-LLD-DS-GA-1201A |
| TQ-28 | KC-4501 | setpoint | answer | What is the discharge temperature trip on KC-4501? | TSHH-4503 > 140 degC, 1oo1. Trips the motor and opens anti-surge recycle FV-4502. | TJC-LLD-IL-KC-4501 |
| TQ-29 | KC-4501 | setpoint | answer | At what discharge pressure does KC-4501 trip? | PSHH-4502 > 14 barg, 1oo2. | TJC-LLD-IL-KC-4501 |
| TQ-30 | DC-3401A | setpoint | answer | What happens on high reactor pressure in DC-3401A? | PSHH-3404 > 5 barg (1oo2) closes H2 injection FV-3403, opens reactor vent PV-3404 and alarms. | TJC-LLD-IL-DC-3401A |
| TQ-31 | DC-3401A | design | answer | What catalyst is in DC-3401A and how much? | Pd on Al2O3 (PdO reduced to Pd), 3.2 m3. | TJC-LLD-DS-DC-3401A |
| TQ-32 | YD-2301 | setpoint | answer | What is the outlet temperature trip on YD-2301? | TSHH-2301 > 125 degC, 1oo1. Trips the drum drive and closes steam inlet TV-2301. | TJC-LLD-IL-YD-2301 |
| TQ-33 | LV-6701 | design | answer | What is the fail action and actuator of LV-6701? | Fail closed; Fisher 667 size 45 spring-diaphragm actuator; rated Cv 110. | TJC-LLD-DS-LV-6701 |
| TQ-34 | CT-7801 | design | answer | What oil goes in the CT-7801 gearbox and when does it trip on temperature? | ISO VG 220, 4.5 L. TSHH-7803 trips the fan at > 90 degC. | TJC-LLD-DS-CT-7801; TJC-LLD-IL-CT-7801 |
| TQ-35 | FA-8901 | design | answer | What are the design pressure, temperature and volume of FA-8901? | 10 barg / FV, 120 degC, 9.6 m3. | TJC-LLD-DS-FA-8901 |
| TQ-36 | FA-8901 | setpoint | answer | What happens on high-high pressure in FA-8901? | PSHH-8902 > 8 barg (1oo2) opens vent PCV-8905 and alarms. | TJC-LLD-IL-FA-8901 |
| TQ-37 | KC-4501 | history | answer | Why did KC-4501 trip on low lube oil pressure and what fixed it? | WO-240084: lube pump gears worn and relief valve set low. Pump overhauled, relief valve reset, 2.5 barg verified. | WO-240084 |
| TQ-38 | PLANT | history | answer | Which work order cost the most? | WO-240113 on EA-5601, Rp 40,794,000 and 30 h downtime: two tubes leaking at the tube-to-tubesheet joint, plugged. Note 26 WOs have no cost recorded. | WO-240113 |
| TQ-39 | LV-6701 | history | answer | Why did LV-6701 stop responding to LIC-6701? | WO-240135: stem seized in PTFE packing (over-tightened plus fines). Stem freed, packing renewed, valve re-stroked. | WO-240135 |
| TQ-40 | GA-1201A | history | answer | What caused the hexane seal leak on GA-1201A? | WO-240002: API Plan 11 flush orifice RO-1201 partly plugged, so the seal faces ran dry and scored. | WO-240002 |
| TQ-41 | PLANT | history | answer | How many corrective work orders are there, and on which assets? | 53 of 211: 7 each on GA-1201A, YD-2301, KC-4501, EA-5601, LV-6701 and CT-7801, 6 on DC-3401A, 5 on FA-8901. | Maintenance history (work-orders/) |
| TQ-42 | DC-3401A | image | answer | Show me the P&ID for DC-3401A. | Shows the TJC-LLD-PID-3401 picture and notes the title block reads XXXX. | TJC-LLD-PID-3401 |
| TQ-43 | GA-1201A | image | answer | Show me the GA drawing of GA-1201A. | Shows the TJC-LLD-GA-GA-1201A picture: overall length 1850 mm, dry weight 690 kg, nozzles N1 to N5. | TJC-LLD-GA-GA-1201A |
| TQ-44 | KC-4501 | image | answer | Where is KC-4501 located? Show the plot plan. | Shows the TJC-LLD-PP-KC-4501 picture with its grid reference. | TJC-LLD-PP-KC-4501 |
| TQ-45 | PLANT | ambiguous | clarify | What is the vibration trip setpoint? | Ambiguous. Ask which asset: GA-1201A VSHH-1201 > 7.1 mm/s, KC-4501 VSHH-4505 > 11 mm/s, CT-7801 VSHH-7802 > 9 mm/s. | TJC-LLD-IL-GA-1201A; TJC-LLD-IL-KC-4501; TJC-LLD-IL-CT-7801 |
| TQ-46 | PLANT | ambiguous | clarify | What is the high-high level trip? | Ambiguous. Ask which vessel: LSHH-6710 > 85% (separator, LV-6701), LSHH-8901 > 85% (FA-8901), LSHH-4510 > 80% (KC-4501 KO drum), LSHH-2303 > 90% (YD-2301 chute). | IL sheets for LV-6701, FA-8901, KC-4501, YD-2301 |
| TQ-47 | PLANT | ambiguous | clarify | Why did the pump trip? | Ambiguous. Ask which pump and when: GA-1201A tripped on VSHH-1201 (WO-240003); reflux pump GA-8920 is tripped by LSLL-8901. | WO-240003; TJC-LLD-IL-FA-8901 |
| TQ-48 | PLANT | ambiguous | clarify | What is the design temperature? | Ambiguous. Ask which equipment: e.g. DC-3401A 250 degC, YD-2301 150 degC, FA-8901 120 degC. | DS sheets |
| TQ-49 | PLANT | ambiguous | clarify | How do I purge it before opening? | Ambiguous. Ask which equipment: DC-3401A (purge until AI-3401 < 100 ppm, OPL-DC-3401A-02) or YD-2301 (N2 purge, OPL-YD-2301-01). | OPL-DC-3401A-02; OPL-YD-2301-01 |
| TQ-50 | PLANT | ambiguous | clarify | Is the drum OK? | Ambiguous. Ask which drum: FA-8901 reflux accumulator drum or the YD-2301 dryer drum. Condition needs live data. | none |
| TQ-51 | GA-1201A | typo | answer | At what vibraton does GA1201A trip? | VSHH-1201 > 7.1 mm/s RMS, 1oo2 (same as TQ-01). The typo and missing dash must be tolerated. | TJC-LLD-IL-GA-1201A |
| TQ-52 | GA-1201A | typo | answer | ga 1201a alignmnet targets | Angular < 0.05 mm/100 mm and offset < 0.05 mm (same as TQ-03). | OPL-GA-1201A-03 |
| TQ-53 | KC-4501 | typo | answer | What trips KC-4051 on low lube oil presure? | Near-miss tag: read as KC-4501. PSLL-4504 < 1.5 barg, 2oo3 (same as TQ-14). The bot should say it assumed KC-4501. | TJC-LLD-IL-KC-4501 |
| TQ-54 | DC-3401A | typo | answer | dc3401a bed temprature trip | TSHH-3401 > 230 degC, 2oo3 (same as TQ-12). | TJC-LLD-IL-DC-3401A |
| TQ-55 | KC-4501 | typo | answer | What does WO 240084 say? | KC-4501 tripped on PSLL-4504; lube pump gears worn and relief valve set low; pump overhauled, 2.5 barg verified. | WO-240084 |
| TQ-56 | GA-1201A | indonesian | answer | Getaran pompa GA-1201A naik ke 5.3 mm/s, apa yang harus dicek? | Answer in Indonesian. Alarm 4.5, trip 7.1 mm/s; past misalignment chain (WO-240003); follow OPL-GA-1201A-07 and alignment OPL-03. | OPL-GA-1201A-07; WO-240003; TJC-LLD-IL-GA-1201A |
| TQ-57 | LV-6701 | indonesian | answer | Kenapa LV6701 tidak merespon LIC-6701? | Answer in Indonesian. WO-240135: stem seized in PTFE packing (over-tightened plus fines). | WO-240135 |
| TQ-58 | KC-4501 | indonesian | answer | Kompresor KC-4501 trip karena tekanan oli rendah, penyebabnya apa? | Answer in Indonesian. PSLL-4504 < 1.5 barg; WO-240084 worn lube pump gears and relief valve set low. | WO-240084; TJC-LLD-IL-KC-4501 |
| TQ-59 | DC-3401A | indonesian | answer | Tunjukkan gambar P&ID DC3401A | Shows the TJC-LLD-PID-3401 picture; answer in Indonesian. | TJC-LLD-PID-3401 |
| TQ-60 | YD-2301 | indonesian | answer | Apa yang harus dipastikan sebelum uap masuk ke pengering YD-2301? | Answer in Indonesian. N2 purge FT-2302 > 200 kg/h and AT-2307 O2 < 5%; never bypass FSLL-2302. | OPL-YD-2301-01 |
