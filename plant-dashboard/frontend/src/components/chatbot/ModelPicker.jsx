import PillSelect from "./PillSelect.jsx";
import { IconSparkle } from "../common/icons.jsx";

export default function ModelPicker({ models, value, onChange }) {
  if (!models.length) return null;
  const current = models.find((m) => m.id === value);
  return (
    <PillSelect
      label={current ? current.name.replace(/^Gemini /, "") : "Model"}
      icon={<IconSparkle width={17} height={17} fill="currentColor" stroke="none" />}
      items={models.map((m) => ({ value: m.id, title: m.name, desc: m.description }))}
      value={value}
      onChange={onChange}
      ariaLabel="Gemini model"
      menuTitle="Gemini models (free tier)"
    />
  );
}
