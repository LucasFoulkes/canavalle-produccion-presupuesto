import { Badge } from "@/components/ui/badge"

interface ActionButtonProps {
    action: string
}

export function ActionBadge({ action }: ActionButtonProps) {
    const displayText = action.replace(/_/g, ' ')

    return (
        <div className="w-full flex justify-center items-center top-0">
            <Badge className="capitalize">
                {displayText}
            </Badge>
        </div>
    )
}
