"use client"

import * as React from "react"
import {
    Command,
    Frame,
    Map,
    PieChart,
    SquareTerminal,
    Database,
    Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { SidebarSearch } from "@/components/sidebar-search"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link } from '@tanstack/react-router'

const data = {
    user: {
        name: "Lucas Foulkes",
        email: "lukas@cananvalle.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        // Infraestructura productiva
        {
            title: "Infraestructura",
            url: "/finca",
            icon: SquareTerminal,
            isActive: false,
            items: [
                { title: "Fincas", url: "/finca" },
                { title: "Bloques", url: "/bloque" },
                { title: "Camas", url: "/cama" },
                { title: "Grupos de Cama", url: "/grupo_cama" },
                { title: "Secciones", url: "/seccion" },
            ],
        },
        // Material vegetal
        {
            title: "Material Vegetal",
            url: "/variedad",
            icon: Frame,
            isActive: false,
            items: [
                { title: "Variedades", url: "/variedad" },
                { title: "Breeders", url: "/breeder" },
                { title: "Patrones", url: "/patron" },
                { title: "Estados Gr. Cama", url: "/grupo_cama_estado" },
                { title: "Tipos de Planta", url: "/grupo_cama_tipo_planta" },
            ],
        },
        // Fenología y desarrollo
        {
            title: 'Fenología',
            url: '/estados_fenologicos',
            icon: PieChart,
            isActive: false,
            items: [
                { title: "Estados Fenológicos", url: "/estados_fenologicos" },
                { title: "Resumen Fenológico", url: "/resumen_fenologico" },
                { title: "Tipos de Estado", url: "/estado_fenologico_tipo" },
            ],
        },
        // Operaciones y producción
        {
            title: 'Operaciones',
            url: '/pinche',
            icon: Database,
            isActive: false,
            items: [
                { title: 'Pinches', url: '/pinche' },
                { title: 'Tipos de Pinche', url: '/pinche_tipo' },
                { title: 'Producción', url: '/produccion' },
            ],
        },
        // Observaciones y GPS
        {
            title: 'Observaciones',
            url: '/observacion',
            icon: Map,
            isActive: false,
            items: [
                { title: "Observaciones", url: "/observacion" },
                { title: 'Puntos GPS', url: '/puntos_gps' },
            ],
        },
        // Administración y usuarios
        {
            title: 'Administración',
            url: '/usuario',
            icon: Users,
            isActive: false,
            items: [
                { title: 'Usuarios', url: '/usuario' },
            ],
        },
    ],
    // projects removed (Acciones section)
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to="/">
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <Command className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">Cananvalle</span>
                                    <span className="truncate text-xs">Ecuador</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <div className="px-2 pb-2">
                    <SidebarSearch items={data.navMain} />
                </div>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} label="Base" />
                <NavMain
                    label="Resúmenes"
                    items={[
                        {
                            title: 'Área productiva (FBV)',
                            url: '/area_productiva',
                            icon: PieChart,
                            isActive: false,
                            items: [],
                        },
                        {
                            title: 'Obs. por cama y sección',
                            url: '/observaciones_por_cama',
                            icon: PieChart,
                            isActive: false,
                            items: [],
                        },
                        {
                            title: 'Resumen Fenológico',
                            url: '/resumen_fenologico',
                            icon: PieChart,
                            isActive: false,
                            items: [],
                        },
                    ]}
                />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    )
}
