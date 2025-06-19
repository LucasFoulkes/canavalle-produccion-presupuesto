import { Badge } from "@/components/ui/badge"

interface ActionButtonProps {
    action: string
}

export function ActionButton({ action }: ActionButtonProps) {
    const displayText = action.replace(/_/g, ' ')

    return (
        <div className="w-full flex justify-center items-center">
            <Badge className="capitalize">
                {displayText}
            </Badge>
        </div>
    )
}
