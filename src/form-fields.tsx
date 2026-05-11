import { Form } from "@raycast/api";
import { Option } from "./model-options";

type DropdownProps = {
  id: string;
  title: string;
  options: Option[];
  defaultValue?: string;
  value?: string;
  info?: string;
  storeValue?: boolean;
  onChange?: (value: string) => void;
};

export function OptionDropdown({ id, title, options, defaultValue, value, info, storeValue, onChange }: DropdownProps) {
  return (
    <Form.Dropdown
      id={id}
      title={title}
      defaultValue={defaultValue}
      value={value}
      info={info}
      storeValue={storeValue}
      onChange={onChange}
    >
      {options.map((option) => (
        <Form.Dropdown.Item key={option.value} title={option.title} value={option.value} />
      ))}
    </Form.Dropdown>
  );
}
