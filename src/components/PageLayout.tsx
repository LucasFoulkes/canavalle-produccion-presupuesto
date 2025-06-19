import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ReactNode } from 'react'

interface PageLayoutProps {
    items: Array<{ id: string | number; nombre: string }>
    title: string
    onItemSelect: (item: any) => void
    columns?: 1 | 2 | 4
    mainTitle?: string // Optional main title (like "Finca Name")
    actionComponent?: ReactNode // Optional action component
    absoluteHeader?: boolean // Whether header should be absolute positioned
}

function PageLayout({ items, title, onItemSelect, columns = 2, mainTitle, actionComponent, absoluteHeader = true }: PageLayoutProps) {
    const getGridCols = () => {
        switch (columns) {
            case 1: return 'grid-cols-1'
            case 2: return 'grid-cols-2'
            case 4: return 'grid-cols-4'
            default: return 'grid-cols-2'
        }
    }

    return (<div className="flex flex-col p-4 gap-4 h-screen">
        {mainTitle ? (
            <header className={`flex flex-col gap-2 justify-center items-center ${absoluteHeader ? 'absolute left-0 right-0 top-4 z-10' : ''
                }`}>
                <h1 className='text-2xl font-bold capitalize'>
                    {mainTitle}
                </h1>
                <span>
                    Selecciona una {title}
                </span>
                {actionComponent}
            </header>
        ) : (
            <h1 className={`text-center capitalize ${absoluteHeader ? 'absolute top-4 left-0 right-0 z-1' : ''
                }`}>
                Selecciona una {title}
            </h1>
        )}            {absoluteHeader ? (
            <div className="grid gap-3 w-full mt-auto mb-auto">
                <div className={`grid gap-3 ${getGridCols()}`}>
                    {items.map(item => (
                        <Button
                            key={item.id}
                            className={`w-full h-full capitalize text-lg ${columns === 1 ? 'h-20' : 'aspect-square'}`}
                            onClick={() => onItemSelect(item)}
                        >
                            {item.nombre}
                        </Button>
                    ))}
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-center min-h-full py-4">
                        <div className={`grid gap-3 w-full max-w-2xl ${getGridCols()}`}>
                            {items.map(item => (
                                <Button
                                    key={item.id}
                                    className={`w-full capitalize text-lg ${columns === 1 ? 'h-20' : 'min-h-[80px] aspect-square'}`}
                                    onClick={() => onItemSelect(item)}
                                >
                                    {item.nombre}
                                </Button>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        )}
    </div>
    )
}

export default PageLayout