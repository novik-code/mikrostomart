"use client";

export default function OrdersTab({ orders }: { orders: any[] }) {
const renderOrdersTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2>Historia Zamówień</h2>
        {orders.length === 0 ? <p>Brak zamówień.</p> : orders.map(o => (
            <div key={o.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginRight: '1rem' }}>
                            {new Date(o.created_at).toLocaleString('pl-PL')}
                        </span>
                        <span style={{ fontWeight: 'bold' }}>{o.customer_details.name}</span>
                        <span style={{ margin: '0 0.5rem', color: 'var(--color-text-muted)' }}>|</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{o.customer_details.email}</span>
                    </div>
                    <div>
                        <span style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '1.2rem' }}>{o.total_amount} PLN</span>
                        <span style={{ marginLeft: '1rem', background: 'green', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{o.status}</span>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                        <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Produkty:</h4>
                        <ul style={{ paddingLeft: '1.5rem' }}>
                            {o.items.map((item: any, idx: number) => (
                                <li key={idx} style={{ marginBottom: '0.3rem' }}>
                                    {item.name} (x{item.quantity || 1}) - {item.price} PLN
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Adres:</h4>
                        <p style={{ lineHeight: '1.5', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                            {o.customer_details.street} {o.customer_details.houseNumber}{o.customer_details.apartmentNumber ? '/' + o.customer_details.apartmentNumber : ''}<br />
                            {o.customer_details.zipCode} {o.customer_details.city}<br />
                            Tel: {o.customer_details.phone}
                        </p>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>ID: {o.payment_id}</p>
                    </div>
                </div>
            </div>
        ))}
    </div>
);
    return renderOrdersTab();
}
