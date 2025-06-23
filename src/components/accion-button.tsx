import { Button } from "@/components/ui/button";

interface AccionButtonProps {
    accion?: string;
}

export default function AccionButton({ accion }: AccionButtonProps) {
    return (
        <Button className="capitalize absolute top-0 left-0 rounded-none rounded-r-xl text-xs p-2">
            {accion?.replace(/_/g, " ")}
        </Button>
    );
}