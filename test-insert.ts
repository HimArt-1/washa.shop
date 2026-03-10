import { Database } from './src/types/database';

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

// Create an empty object that satisfies the type and log its keys
const a: ProductInsert = {
    artwork_id: "test",
    artist_id: "test",
    title: "test",
    description: "test",
    type: "print",
    price: 10,
    currency: "SAR",
    image_url: "url",
    sizes: null,
    stock_quantity: 100,
    badge: null,
    original_price: null,
    // What if artist_id is missing?
};
