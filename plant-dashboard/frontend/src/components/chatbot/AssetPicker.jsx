import PillSelect from "./PillSelect.jsx";

const ASSETS = [
  { tag: "Auto Detect", name: "Auto-detect the asset from your question" },
  { tag: "GA-1201A", name: "Hexane Feed Pump" },
  { tag: "YD-2301", name: "Polymer Dryer" },
  { tag: "DC-3401A", name: "Reactor" },
  { tag: "KC-4501", name: "Recycle Compressor" },
  { tag: "EA-5601", name: "Solvent Heater" },
  { tag: "LV-6701", name: "Level Control Valve" },
  { tag: "CT-7801", name: "Cooling Tower Fan" },
  { tag: "FA-8901", name: "Reflux Accumulator Drum" },
];

const ITEMS = ASSETS.map((a) => ({ value: a.tag, title: a.tag || "Auto Detect", desc: a.name }));

export default function AssetPicker({ value, onChange }) {
  return (
    <PillSelect
      label={value || "Auto Detect"}
      items={ITEMS}
      value={value}
      onChange={onChange}
      ariaLabel="Target asset"
      menuTitle="Target asset"
    />
  );
}
