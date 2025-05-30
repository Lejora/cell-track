import { Search } from "lucide-react"
import { Input } from "./ui/input"

interface DataSearchBoxProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DataSearchBox = ({ value, onChange }: DataSearchBoxProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="日付でデータを検索..."
          className="w-full rounded-md pl-8 md:w-[200px] lg:w-[300px]"
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  )
}