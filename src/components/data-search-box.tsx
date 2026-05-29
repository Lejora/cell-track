import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface DataSearchBoxProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  inputClassName?: string;
}

export const DataSearchBox = ({
  value,
  onChange,
  className,
  inputClassName,
}: DataSearchBoxProps) => {
  const handleClear = () => {
    const event = {
      target: { value: "" },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(event);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="時刻・MCC・MNC・TAC・CIDで検索..."
          className={cn(
            "w-[220px] rounded-md pl-8 pr-8 focus:ring-2 focus:ring-blue-500 sm:w-[260px] lg:w-[350px]",
            inputClassName
          )}
          value={value}
          onChange={onChange}
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-6 w-6 p-0 hover:bg-muted"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
