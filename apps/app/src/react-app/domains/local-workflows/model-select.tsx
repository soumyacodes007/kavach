import type { LocalAvailableModel, LocalModelRef } from "@openwork/types/local-workflows";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function modelLabel(model: LocalModelRef) {
  return `${model.providerID} / ${model.modelID}`;
}

export function ModelSelect(props: {
  label: string;
  testId: string;
  models: LocalAvailableModel[];
  value: LocalModelRef | null;
  onChange: (value: LocalModelRef | null) => void;
  emptyLabel: string;
  disabled?: boolean;
}) {
  const key = (model: LocalModelRef) => `${model.providerID}/${model.modelID}`;
  const selectedKey = props.value ? key(props.value) : "";
  const unavailable = props.value && !props.models.some((model) => key(model) === selectedKey);
  const selectedModel = props.models.find((model) => key(model) === selectedKey);
  const selectedLabel = selectedModel ? `${selectedModel.name} · ${selectedModel.providerName}` : props.value ? `${modelLabel(props.value)} (unavailable)` : props.emptyLabel;
  return (
    <div className="grid min-w-0 gap-1.5 text-sm">
      <span className="font-medium">{props.label}</span>
      <Select
        value={selectedKey}
        disabled={props.disabled}
        onValueChange={(value) => {
          if (value === "") { props.onChange(null); return; }
          const model = props.models.find((item) => key(item) === value);
          if (model) props.onChange({ providerID: model.providerID, modelID: model.modelID });
        }}
      >
        <SelectTrigger aria-label={props.label} data-testid={props.testId} className="w-full min-w-0 rounded-xl">
          <SelectValue><span className="truncate">{selectedLabel}</span></SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value="" data-testid={`${props.testId}-option-auto`}>{props.emptyLabel}</SelectItem>
          {unavailable && props.value ? <SelectItem value={selectedKey} disabled>{modelLabel(props.value)} (unavailable)</SelectItem> : null}
          {props.models.map((model) => <SelectItem key={key(model)} value={key(model)} data-testid={`${props.testId}-option-${key(model)}`}>{model.name} · {model.providerName}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
