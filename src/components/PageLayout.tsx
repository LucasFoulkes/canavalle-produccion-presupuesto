import { Button } from '@/components/ui/button'
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
        )}            <div className={`grid gap-3 w-full ${absoluteHeader ? 'mt-auto mb-auto' : 'flex-1 content-center'}`}>
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
    </div>
    )
}

export default PageLayout