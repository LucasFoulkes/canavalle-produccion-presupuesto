import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function Configuracion() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-bold">Configuración</h1>

            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Información de Usuario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {user ? (
                        <>
                            <div className="flex justify-between">
                                <span className="font-medium">Nombre:</span>
                                <span>{user.nombre || 'No definido'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Rol:</span>
                                <span>{user.role}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">PIN:</span>
                                <span>••••••</span>
                            </div>
                        </>
                    ) : (
                        <p>No hay información de usuario disponible</p>
                    )}
                </CardContent>
                <CardFooter>
                    <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleLogout}
                    >
                        Cerrar Sesión
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
