import { Card } from '@/components/ui/card'
import type { CamaGroup } from '@/lib/utils'

export function CamaGroupsList({ groups }: { groups: CamaGroup[] }) {
    return (
        <div className="flex-1 overflow-y-auto space-y-4">
            {groups.map((group, index) => (
                <Card key={index} className="p-4">
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <span className="text-sm font-medium text-gray-700">{`${group.from}-${group.to}`}</span>
                        <span className="text-sm text-gray-600">{group.variety}</span>
                        <span className="text-sm text-gray-600">{group.area} m²</span>
                    </div>
                </Card>
            ))}
        </div>
    )
}




