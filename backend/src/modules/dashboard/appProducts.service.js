import { supabase } from '../../config/supabase.js';
import { inChunks } from './sourceCards.service.js';

const unwrap = ({ data, error }) => {
    if (error) throw error;
    return data;
};

/** The one to show among a product's rows: an active one first, then the first in the order given. */
const preferActive = (rows) => rows.find((row) => row.status === 'active') ?? rows[0] ?? null;

/**
 * Every product of one app (product_catalog rows, which belong to the app through their category), all time: its name, category,
 * status, selling price (and MRP when it is higher), and its first active picture. Newest first.
 * Returns { app: { id, name }, total, products: [{ id, name, category, status, price, mrp, discountPct, billing, memberPrice, image, imageCount, createdAt }] } or null.
 */
export async function getAppProducts(trustId) {
    const [trust, categories] = await Promise.all([
        supabase.from('Trust').select('id, name').eq('id', trustId).maybeSingle(),
        supabase.from('product_categories').select('id, name').eq('trust_id', trustId),
    ]);
    const app = unwrap(trust);
    if (!app) return null;

    const categoryName = new Map(unwrap(categories).map((row) => [row.id, row.name]));
    const products = await inChunks([...categoryName.keys()], async (ids) =>
        unwrap(await supabase.from('product_catalog').select('id, product_name, status, category_id, created_at').in('category_id', ids))
    );
    const productIds = products.map((product) => product.id);

    const [prices, images] = await Promise.all([
        inChunks(productIds, async (ids) => unwrap(await supabase.from('product_price').select('product_id, mrp, discount_pct, price_after_discount, member_price, billing_type, status, created_at').in('product_id', ids))),
        inChunks(productIds, async (ids) => unwrap(await supabase.from('product_images').select('product_id, image_url, sort_order, status').in('product_id', ids))),
    ]);

    const group = (rows) => {
        const map = new Map();
        rows.forEach((row) => map.set(row.product_id, [...(map.get(row.product_id) ?? []), row]));
        return map;
    };
    const pricesOf = group(prices);
    const imagesOf = group(images);

    const rows = products
        .map((product) => {
            const price = preferActive((pricesOf.get(product.id) ?? []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            const pictures = (imagesOf.get(product.id) ?? []).filter((image) => image.image_url && image.status === 'active').sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
            const selling = price ? Number(price.price_after_discount ?? price.mrp ?? 0) : null;
            const mrp = price ? Number(price.mrp ?? 0) : null;
            return {
                id: product.id,
                name: product.product_name?.trim() || 'Untitled product',
                category: categoryName.get(product.category_id) ?? null,
                status: product.status ?? null,
                price: selling,
                mrp: mrp && selling != null && mrp > selling ? mrp : null,
                discountPct: price?.discount_pct ? Number(price.discount_pct) : null,
                billing: price?.billing_type ?? null,
                memberPrice: price?.member_price != null ? Number(price.member_price) : null,
                image: pictures[0]?.image_url ?? null,
                imageCount: pictures.length,
                createdAt: product.created_at,
            };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return { app: { id: app.id, name: app.name?.trim() || 'Untitled app' }, total: rows.length, products: rows };
}
