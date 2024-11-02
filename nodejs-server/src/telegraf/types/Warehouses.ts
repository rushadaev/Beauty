export interface Warehouse {
    ID: number;
    name: string;
    address: string;
    workTime: string;
    acceptsQR: boolean;
}

export interface WarehouseResponse {
    data: Warehouse[];
}
