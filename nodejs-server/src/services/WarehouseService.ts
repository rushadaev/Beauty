import wildberriesSuppliesApi from './wildberriesSuppliesApi';

class WarehouseService {
    async getWarehouses(page = 1) {
        const warehouses = await wildberriesSuppliesApi.getWarehouses();

        // Define the prioritized warehouses in the desired order
        const prioritizedWarehouses = [
            { name: 'Коледино', id: 507 },
            { name: 'Электросталь', id: 120762 },
            { name: 'Подольск', id: 117501 },
            { name: 'Подольск 3', id: 218623 },
            { name: 'Подольск 4', id: 301229 },
            { name: 'Кузнецк', id: 302335 },
            { name: 'Казань', id: 117986 },
            { name: 'Краснодар (Тихорецкая)', id: 130744 },
            { name: 'Тула', id: 206348 },
            { name: 'Белые Столбы', id: 206236 },
            { name: 'Невинномысск', id: 208277 },
            { name: 'Екатеринбург - Испытателей 14г', id: 1733 },
            { name: 'Екатеринбург - Перспективный 12/2', id: 300571 },
            { name: 'Новосибирск', id: 686 },
            { name: 'Чашниково', id: 321932 },
            { name: 'Рязань (Тюшевское)', id: 301760 },
        ];

        // Separate and sort prioritized warehouses
        const prioritizedList = [];
        const otherWarehouses = [];

        for (const pWarehouse of prioritizedWarehouses) {
            for (const warehouse of warehouses) {
                if (warehouse.ID === pWarehouse.id && warehouse.name === pWarehouse.name) {
                    prioritizedList.push(warehouse);
                    break;
                }
            }
        }

        for (const warehouse of warehouses) {
            if (!prioritizedList.some(p => p.ID === warehouse.ID)) {
                otherWarehouses.push(warehouse);
            }
        }

        // Merge prioritized warehouses with the rest
        const sortedWarehouses = [...prioritizedList, ...otherWarehouses];

        // Paginate warehouses
        const perPage = 20;
        const totalPages = Math.ceil(sortedWarehouses.length / perPage);
        page = Math.max(1, Math.min(totalPages, page));
        const start = (page - 1) * perPage;
        const currentWarehouses = sortedWarehouses.slice(start, start + perPage);

        // Prepare response data for Telegram in two columns
        const keyboardButtons = [];
        for (let i = 0; i < currentWarehouses.length; i += 2) {
            const row = [
                {
                    text: currentWarehouses[i].name,
                    callback_data: `select_warehouse_${currentWarehouses[i].ID}`
                }
            ];
            if (i + 1 < currentWarehouses.length) {
                row.push({
                    text: currentWarehouses[i + 1].name,
                    callback_data: `select_warehouse_${currentWarehouses[i + 1].ID}`
                });
            }
            keyboardButtons.push(row);
        }

        // Add navigation buttons
        const navigationButtons = [];
        if (page > 1) {
            navigationButtons.push({ text: '← Назад', callback_data: `warehouses_prev` });
        }
        if (page < totalPages) {
            navigationButtons.push({ text: 'Вперед →', callback_data: `warehouses_next` });
        }
        if (navigationButtons.length) {
            keyboardButtons.push(navigationButtons);
        }

        const message = 'Выберите склад:'; // Пока не используется, но может пригодиться в будущем

        return {
            message,
            keyboard: keyboardButtons
        };
    }
}

export default new WarehouseService();
