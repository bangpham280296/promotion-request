import { useEffect } from 'react';
import flatpickr from 'flatpickr';
// import 'flatpickr/dist/flatpickr.css';
import Label from './Label';
import { CalenderIcon } from '../../icons';
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  size?: "sm" | "md";
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
  className = "",
  inputClassName = "",
  labelClassName = "",
  size = "md",
}: PropsType) {
  useEffect(() => {
    const flatPickr = flatpickr(`#${id}`, {
      mode: mode || "single",
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate,
      onChange,
    });

    return () => {
      if (!Array.isArray(flatPickr)) {
        flatPickr.destroy();
      }
    };
  }, [mode, onChange, id, defaultDate]);

  const isSmall = size === "sm";

  return (
    <div className={className}>
      {label && (
        <Label
          htmlFor={id}
          className={`${isSmall ? "!text-xs !mb-1 text-gray-600 dark:text-gray-300 font-medium" : ""} ${labelClassName}`}
        >
          {label}
        </Label>
      )}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          className={`w-full rounded-lg border appearance-none shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800 ${
            isSmall
              ? "h-9 px-3 py-1.5 text-xs pr-9"
              : "h-11 px-4 py-2.5 text-sm pr-10"
          } ${inputClassName}`}
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className={isSmall ? "size-4" : "size-6"} />
        </span>
      </div>
    </div>
  );
}
